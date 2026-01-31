import React from "react";

interface LabeledInputProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const LabeledInput: React.FC<LabeledInputProps> = ({ label, value, onChange }) => {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium">{label}</label>
      <input
        type="text"
        className="w-full border p-2 rounded-md"
        value={value}
        onChange={onChange}
      />
    </div>
  );
}; 