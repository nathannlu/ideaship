'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import {
  Check, ChevronsUpDown, Search, User, Home, Settings, Bell, Calendar,
  Mail, Phone, Heart, Star, AlertCircle, FileText, Image, Link, MapPin,
  Edit, Trash, Share, ArrowRight, Download, Upload, Plus, Check as CheckIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'

// Import all icons dynamically
const loadIcons = async () => {
  try {
    // Dynamically import all icons from lucide-react
    const lucide = await import('lucide-react')
    
    // Filter out non-icon exports
    const iconNames = Object.keys(lucide).filter(key => {
      const value = lucide[key]
      return typeof value === 'function' && key !== 'createLucideIcon' && !key.startsWith('__')
    })
    
    return iconNames.sort()
  } catch (error) {
    console.error('Error loading icons:', error)
    return []
  }
}

interface IconSelectorProps {
  value: string
  onChange: (value: string) => void
}

// Common icons for quick selection
const commonIcons = [
  { name: 'user', component: User },
  { name: 'home', component: Home },
  { name: 'settings', component: Settings },
  { name: 'bell', component: Bell },
  { name: 'calendar', component: Calendar },
  { name: 'mail', component: Mail },
  { name: 'phone', component: Phone },
  { name: 'heart', component: Heart },
  { name: 'star', component: Star },
  { name: 'alert-circle', component: AlertCircle },
  { name: 'file-text', component: FileText },
  { name: 'image', component: Image },
  { name: 'link', component: Link },
  { name: 'map-pin', component: MapPin },
  { name: 'edit', component: Edit },
  { name: 'trash', component: Trash },
  { name: 'share', component: Share },
  { name: 'arrow-right', component: ArrowRight },
  { name: 'download', component: Download },
  { name: 'upload', component: Upload },
  { name: 'plus', component: Plus },
  { name: 'check', component: CheckIcon },
];

export function IconSelector({ value, onChange }: IconSelectorProps) {
  const [open, setOpen] = useState(false)
  const [icons, setIcons] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredIcons, setFilteredIcons] = useState<string[]>([])
  const [showAllIcons, setShowAllIcons] = useState(false)

  // Load icons on mount
  useEffect(() => {
    const fetchIcons = async () => {
      const iconNames = await loadIcons()
      setIcons(iconNames)
      setFilteredIcons(iconNames)
    }

    fetchIcons()
  }, [])
  
  // Filter icons based on search query
  useEffect(() => {
    if (!searchQuery) {
      setFilteredIcons(icons)
    } else {
      const filtered = icons.filter(icon => 
        icon.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredIcons(filtered)
    }
  }, [searchQuery, icons])

  // State for the selected icon component
  const [selectedIconComponent, setSelectedIconComponent] = useState<React.ComponentType<any> | null>(null)

  // Load the selected icon when value changes
  useEffect(() => {
    if (!value) {
      setSelectedIconComponent(null)
      return
    }

    // Load the icon dynamically
    const loadIcon = async () => {
      try {
        const lucide = await import('lucide-react')
        setSelectedIconComponent(lucide[value] || null)
      } catch (error) {
        console.error('Error loading icon:', error)
        setSelectedIconComponent(null)
      }
    }

    loadIcon()
  }, [value])

  // Using SelectedIcon as a variable name for consistency with the rest of the code
  const SelectedIcon = selectedIconComponent

  return (
    <div className="flex flex-col space-y-1.5">
      <label className="text-sm font-medium">Icon</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-between"
          >
            <div className="flex items-center gap-2">
              {SelectedIcon && <SelectedIcon className="h-4 w-4" />}
              <span>{value || "Select icon..."}</span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[320px]" align="start" side="bottom">
          <Command>
            {!showAllIcons ? (
              <div className="p-2">
                <div className="mb-2">
                  <h3 className="font-medium text-sm mb-1 px-1">Common Icons</h3>
                  <div className="grid grid-cols-7 gap-2">
                    {commonIcons.map(icon => (
                      <div
                        key={icon.name}
                        onClick={() => {
                          onChange(icon.name)
                          setOpen(false)
                        }}
                        className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-100 cursor-pointer"
                      >
                        <icon.component className="h-5 w-5" />
                        {value === icon.name && (
                          <Check className="h-3 w-3 text-green-500 absolute top-1 right-1" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => setShowAllIcons(true)}
                >
                  Show All Icons
                </Button>
              </div>
            ) : (
              <>
                <CommandInput
                  placeholder="Search icons..."
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                  className="h-9"
                />
                <CommandEmpty>No icon found.</CommandEmpty>
                <CommandGroup>
                  <ScrollArea className="h-[300px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 mt-1 mb-2"
                      onClick={() => setShowAllIcons(false)}
                    >
                      Back to Common Icons
                    </Button>
                    <div className="grid grid-cols-3 gap-1 p-2">
                      {filteredIcons.map(iconName => {
                        // Dynamically load the icon component
                        const IconComponent = React.lazy(() => {
                          return import('lucide-react').then(module => ({
                            default: module[iconName]
                          }))
                        })

                        return (
                          <CommandItem
                            key={iconName}
                            value={iconName}
                            onSelect={() => {
                              onChange(iconName)
                              setOpen(false)
                            }}
                            className="flex flex-col items-center justify-center p-2 gap-1 cursor-pointer"
                          >
                            <React.Suspense fallback={<div className="h-5 w-5 bg-gray-100 animate-pulse rounded-sm"></div>}>
                              <IconComponent className="h-5 w-5" />
                            </React.Suspense>
                            <span className="text-[10px] truncate w-full text-center">{iconName}</span>
                            {value === iconName && (
                              <Check className="h-3 w-3 text-green-500 absolute top-1 right-1" />
                            )}
                          </CommandItem>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </CommandGroup>
              </>
            )}
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}