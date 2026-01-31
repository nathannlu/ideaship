'use client'

import React from 'react'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { Button } from './button'
import { Label } from './label'

interface ColorPickerProps {
  label: string
  value: string
  onChange: (value: string) => void
}

export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  // Predefined color options
  const colorOptions = [
    '#ffffff', '#000000', '#f44336', '#e91e63', '#9c27b0', 
    '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
    '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b',
    '#ffc107', '#ff9800', '#ff5722', '#795548', '#9e9e9e',
    '#607d8b', 'transparent'
  ]

  return (
    <div className="flex flex-col space-y-1.5">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-start text-left font-normal h-8"
          >
            <div 
              className="h-4 w-4 rounded border mr-2"
              style={{ 
                backgroundColor: value === 'transparent' ? 'transparent' : value,
                backgroundImage: value === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)' : 'none',
                backgroundSize: '8px 8px',
                backgroundPosition: '0 0, 4px 4px',
                borderColor: '#ccc'
              }}
            />
            <span>{value || 'Select color'}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3">
          <div className="grid grid-cols-6 gap-2">
            {colorOptions.map((color) => (
              <div
                key={color}
                className="h-6 w-6 rounded cursor-pointer border border-gray-200 hover:scale-110 transition-transform"
                style={{ 
                  backgroundColor: color === 'transparent' ? 'transparent' : color,
                  backgroundImage: color === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)' : 'none',
                  backgroundSize: '8px 8px',
                  backgroundPosition: '0 0, 4px 4px'
                }}
                onClick={() => onChange(color)}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center">
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
              placeholder="#000000"
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}