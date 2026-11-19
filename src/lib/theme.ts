export const THEME_KEY = "fieldnotes-theme";
export const LIGHT_THEME = "fieldnotes";
export const DARK_THEME = "fieldnotes-dark";
// 在首帧绘制前应用偏好，避免刷新深色页面时先闪现浅色背景。
// 只包含项目常量，不插入用户输入。
export const themeInitScript = `(()=>{let theme;try{theme=localStorage.getItem('${THEME_KEY}')}catch{}if(theme!=='${LIGHT_THEME}'&&theme!=='${DARK_THEME}')theme=matchMedia('(prefers-color-scheme: dark)').matches?'${DARK_THEME}':'${LIGHT_THEME}';document.documentElement.dataset.theme=theme})()`;
