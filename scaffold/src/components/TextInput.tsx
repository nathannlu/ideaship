"use client";

import React from "react";

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * Simple text input component for dynamic text entry.
 */
const TextInput: React.FC<TextInputProps> = (props) => {
  return <input type="text" {...props} />;
};

export default TextInput;