import { useState, useEffect } from "react";

const themes = ["", "theme-dark", "theme-pastel"];

const icons = [
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.106a.75.75 0 010 1.06l-1.591 1.59a.75.75 0 11-1.06-1.06l1.59-1.591a.75.75 0 011.06 0zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.894 17.894a.75.75 0 01-1.06 0l-1.59-1.591a.75.75 0 111.06-1.06l1.591 1.59a.75.75 0 010 1.061zM12 18a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM6.106 17.894a.75.75 0 010-1.06l1.591-1.59a.75.75 0 111.06 1.06l-1.59 1.591a.75.75 0 01-1.06 0zM4.5 12a.75.75 0 01.75-.75h2.25a.75.75 0 010 1.5H5.25a.75.75 0 01-.75-.75zM6.106 6.106a.75.75 0 011.06 0l1.59 1.591a.75.75 0 11-1.06 1.06L6.106 7.167a.75.75 0 010-1.06z" /></svg>,
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-3.833 2.067-7.174 5.165-8.992a.75.75 0 01.819.162z" clipRule="evenodd" /></svg>,
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12.94 3.145a.75.75 0 01.285.659v4.341a.75.75 0 01-.233.56l-3.75 3.75a.75.75 0 01-1.06 0l-3.75-3.75a.75.75 0 01-.233-.56V3.804a.75.75 0 01.285-.659c.247-.155.564-.182.832-.078l.25.099 2.813 1.205a.75.75 0 00.64 0L11.86 3.167a.75.75 0 011.08-.022zM12 15.75a.75.75 0 00.75-.75v-4.5a.75.75 0 00-1.5 0v4.5a.75.75 0 00.75.75z" /><path fillRule="evenodd" d="M5.47 21.53a.75.75 0 010-1.06l3.75-3.75a.75.75 0 011.06 0l3.75 3.75a.75.75 0 11-1.06 1.06L12 20.06l-2.97 2.97a.75.75 0 01-1.06 0l-2.5-2.5z" clipRule="evenodd" /></svg>,
];

export default function ThemeToggle() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const body = document.body;
    body.classList.remove(...themes.filter(Boolean));
    if (themes[index]) {
      body.classList.add(themes[index]);
    }
  }, [index]);

  const nextTheme = () => setIndex((index + 1) % themes.length);

  return (
    <button
      onClick={nextTheme}
      className="p-2 rounded transition-colors duration-300 hover:bg-accent hover:text-bg text-accent"
      aria-label="Toggle theme"
    >
      {icons[index]}
    </button>
  );
}
