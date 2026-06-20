import React, { createContext, useContext, useState } from 'react';

const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');

  const colors = {
    green:  '#2DB562',
    gold:   '#E8A020',
    red:    '#E02020',
    black:  '#1A1A1A',
    white:  '#ffffff',
    bg:     '#F4F5F7',
    text:   '#3D3D3D',
  };

  return (
    <ThemeContext.Provider value={{ theme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}
