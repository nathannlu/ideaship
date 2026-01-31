import { getChatConversation } from "@/actions/chat-conversations"
import { FileManagerProvider } from "@/vfs"
//import ChatPageComponent from "@/components/Chat"
import WorkspaceClient from "./WorkspaceClient"
import { notFound } from "next/navigation"

// Server component that fetches the initial conversation data
export default async function Page({
  params
}: {
  params: { id: string }
}) {
  const { id } = await params
  try {
    const conversationData = await getChatConversation(id)

    return (
      <FileManagerProvider>
        <WorkspaceClient
          initialConversation={conversationData}
        />
      </FileManagerProvider>
    )
  } catch (error) {
    // Return not found if the conversation doesn't exist or the user doesn't have access
    notFound()
  }
}
