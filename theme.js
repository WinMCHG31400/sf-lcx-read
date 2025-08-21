
// 获取切换按钮
const themeBtn = document.getElementById('themeBtn');
const themeBtnImg = document.getElementById('themeBtn_img');
// 检查本地存储中的主题设置
let currentTheme = localStorage.getItem('theme');

// 切换主题函数
function switchTheme() {
    if (currentTheme == 'light') {
        currentTheme = 'dark';
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    } else {
        currentTheme = 'light';
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
    }
}
function initTheme() {
    if (currentTheme == 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
}
// 添加事件监听器
themeBtn.addEventListener('click', () => {
    switchTheme();
});
// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', () => {
    initTheme();
});