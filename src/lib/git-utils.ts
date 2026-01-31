import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import * as git from 'isomorphic-git'
import * as tar from 'tar-stream'
import * as streamBuffers from 'stream-buffers'

// Configure S3 client for DigitalOcean Spaces
const spacesClient = new S3Client({
  region: "us-east-1", // DigitalOcean Spaces use this region
  endpoint: process.env.SPACES_ENDPOINT || "https://nyc3.digitaloceanspaces.com",
  credentials: {
    accessKeyId: process.env.SPACES_KEY || "",
    secretAccessKey: process.env.SPACES_SECRET || "",
  },
})

const BUCKET_NAME = process.env.SPACES_BUCKET || "ideaship"

/**
 * Converts a VFS object to a git repository, creates a tarball, and uploads to DigitalOcean Spaces
 * @param id - The project ID
 * @param vfsObj - The VFS object containing file paths and contents
 * @returns The URL of the uploaded tarball
 */
export async function vfsToGitSnapshot(id: string, vfsObj: Record<string, string>): Promise<string> {
  // Create a temporary directory
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-snapshot-'))
  
  try {
    // Initialize git repo
    await git.init({ fs, dir: tmpDir })
    
    // Write VFS files to the directory
    for (const [filePath, content] of Object.entries(vfsObj)) {
      // Ensure path is relative without leading slash
      const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath
      
      const fullPath = path.join(tmpDir, normalizedPath)
      
      // Create directory if it doesn't exist
      const dirname = path.dirname(fullPath)
      if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname, { recursive: true })
      }
      
      // Write file
      fs.writeFileSync(fullPath, content)
      
      // Add to git
      await git.add({ fs, dir: tmpDir, filepath: normalizedPath })
    }
    
    // Commit changes
    await git.commit({
      fs,
      dir: tmpDir,
      message: `Snapshot for project ${id}`,
      author: {
        name: 'Ideaship',
        email: 'system@ideaship.io'
      }
    })
    
    // Create a tar archive
    const pack = tar.pack()
    const writeStream = new streamBuffers.WritableStreamBuffer()
    
    // Pipe the tar stream to our buffer
    pack.pipe(writeStream)
    
    // Walk the directory recursively and add all files to the tar
    await addDirectoryToTar(tmpDir, pack, '')
    
    // Finalize and get the buffer
    pack.finalize()
    await new Promise(resolve => writeStream.on('finish', resolve))
    const tarBuffer = writeStream.getContents() as Buffer
    
    // Upload to Digital Ocean Spaces
    const key = getGitSnapshotKey(id)
    await spacesClient.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: tarBuffer,
        ContentType: 'application/x-tar',
        ACL: 'public-read',
      })
    )
    
    // Return the URL
    const publicUrl = `https://${BUCKET_NAME}.${process.env.SPACES_ENDPOINT?.replace("https://", "") || "nyc3.digitaloceanspaces.com"}/${key}`
    return publicUrl
  } finally {
    // Clean up temporary directory
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}

/**
 * Helper function to add a directory to a tar stream recursively
 */
async function addDirectoryToTar(baseDir: string, pack: tar.Pack, relativePath: string): Promise<void> {
  const currentDir = path.join(baseDir, relativePath)
  const entries = fs.readdirSync(currentDir, { withFileTypes: true })
  
  for (const entry of entries) {
    const entryRelativePath = path.join(relativePath, entry.name)
    const entryFullPath = path.join(baseDir, entryRelativePath)
    
    if (entry.isDirectory()) {
      // Add directory entry (with trailing slash)
      pack.entry({ name: entryRelativePath + '/' }, '')
      
      // Recursively add contents
      await addDirectoryToTar(baseDir, pack, entryRelativePath)
    } else if (entry.isFile()) {
      // Add file entry
      const content = fs.readFileSync(entryFullPath)
      const stats = fs.statSync(entryFullPath)
      
      pack.entry(
        { 
          name: entryRelativePath,
          size: stats.size,
          mode: stats.mode,
          mtime: stats.mtime
        }, 
        content
      )
    }
  }
}

/**
 * Fetches a git snapshot tarball from DigitalOcean Spaces and extracts it
 * @param id - The project ID to fetch
 * @returns The VFS object with file paths and contents
 */
export async function gitSnapshotToVfs(id: string): Promise<Record<string, string>> {
  // Create a temporary directory
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-extract-'))
  
  try {
    // Download the tarball from DigitalOcean Spaces
    const key = getGitSnapshotKey(id)
    
    try {
      const response = await spacesClient.send(
        new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key
        })
      )
      
      if (!response.Body) {
        throw new Error(`Failed to retrieve git snapshot for project ${id}`)
      }
      
      // Convert the readable stream to a buffer
      const chunks: Uint8Array[] = []
      for await (const chunk of response.Body as any) {
        chunks.push(chunk)
      }
      const tarBuffer = Buffer.concat(chunks)
      
      // Extract the tarball
      const extract = tar.extract()
      const entries: {name: string, content: Buffer}[] = []
      
      extract.on('entry', (header, stream, next) => {
        // Skip directories and .git files
        if (header.name.endsWith('/') || header.name.startsWith('.git/')) {
          stream.resume()
          next()
          return
        }
        
        const chunks: Buffer[] = []
        
        stream.on('data', (chunk) => {
          chunks.push(chunk)
        })
        
        stream.on('end', () => {
          if (chunks.length > 0) {
            entries.push({
              name: header.name,
              content: Buffer.concat(chunks)
            })
          }
          next()
        })
        
        stream.resume()
      })
      
      // Process the tarball
      await new Promise<void>((resolve, reject) => {
        extract.on('finish', () => resolve())
        extract.on('error', (err) => reject(err))
        extract.write(tarBuffer)
        extract.end()
      })
      
      // Build the VFS object
      const vfsObj: Record<string, string> = {}
      
      for (const entry of entries) {
        vfsObj[entry.name] = entry.content.toString('utf8')
      }
      
      return vfsObj
      
    } catch (error: any) {
      // Check if the error is NoSuchKey (tarball doesn't exist)
      if (error.Code === 'NoSuchKey' || error.name === 'NoSuchKey') {
        console.log(`No existing git snapshot found for project ${id}, starting with empty VFS`)
        return {} // Return empty VFS
      }
      
      // Re-throw other errors
      throw error
    }
  } finally {
    // Clean up temporary directory
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}

/**
 * Generates the key for storing the git snapshot in DigitalOcean Spaces
 * @param id - The project ID
 * @returns The storage key
 */
export function getGitSnapshotKey(id: string): string {
  return `git-snapshots/${id}/repo.tar`
}