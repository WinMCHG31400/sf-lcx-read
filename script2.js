const CONFIG = {
    CHAPTERS_FILE: 'chapters.json',    // 章节列表JSON路径
    MANIFEST_FILE: '',
    CACHE_BUSTING: true               // 是否添加缓存清除参数
};

let chapters = [];        // 存储章节列表
let fileList = [];        // 存储当前章节的文章列表
let currentIndex = -1;    // 当前文章索引
let currentFileContent = ''; // 当前文件内容
let currentChapter = '';  // 当前章节名称

// 获取DOM元素
const chapterSelector = document.getElementById('fileSelector_chapter');
const fileSelector = document.getElementById('fileSelector');
const fileContent = document.getElementById('fileContent');
const fileInfo = document.getElementById('fileInfo');
const filePosition = document.getElementById('filePosition');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const downloadBtn = document.getElementById('downloadBtn');
const shareBtn = document.getElementById('shareBtn');
const scrollTopBtn = document.getElementById('scrollTopBtn');

// 获取章节列表
async function fetchChapters() {
    try {
        const url = CONFIG.CACHE_BUSTING
            ? `${CONFIG.CHAPTERS_FILE}?t=${Date.now()}`
            : CONFIG.CHAPTERS_FILE;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`获取章节列表失败 (HTTP ${response.status})`);
        }

        const data = await response.json();

        if (!data.chapters || !Array.isArray(data.chapters)) {
            throw new Error('无效的章节清单格式');
        }

        return data.chapters;
    } catch (error) {
        console.error('加载章节列表失败:', error);
        showError('加载章节列表失败: ' + error.message);
        return [];
    }
}

// 获取指定章节的文章列表
async function fetchFilesForChapter(chapter) {
    try {
        const manifestFile = chapters[chapter] + ".json";
        const url = CONFIG.CACHE_BUSTING
            ? `${manifestFile}?t=${Date.now()}`
            : manifestFile;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`获取文章列表失败 (HTTP ${response.status})`);
        }

        const data = await response.json();

        if (!data.files || !Array.isArray(data.files)) {
            throw new Error('无效的文章清单格式');
        }

        return data.files;
    } catch (error) {
        console.error('加载文章列表失败:', error);
        showError('加载文章列表失败: ' + error.message);
        return [];
    }
}

// 读取文件内容
async function readFile(filename) {
    try {
        fileContent.innerHTML = `<span class="loading"></span>正在加载文件...`;

        // 构建文件名：章节名-文章名.txt
        const fullFilename = `${filename}.txt`;
        const url = CONFIG.CACHE_BUSTING
            ? `${fullFilename}?t=${Date.now()}`
            : fullFilename;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`文件加载失败 (HTTP ${response.status})`);
        }

        const buffer = await response.arrayBuffer();
        fileInfo.textContent = `大小: ${formatFileSize(buffer.byteLength)}`;
        const decoder = new TextDecoder();
        return decoder.decode(buffer);
    } catch (error) {
        console.error('读取文件失败:', error);
        throw new Error(`无法读取文件: ${error.message}`);
    }
}

// 下载当前文件
function downloadCurrentFile() {
    if (currentIndex === -1 || !currentFileContent) return;

    const filename = fileList[currentIndex];
    const fullFilename = `${currentChapter}-${filename}.txt`;
    const blob = new Blob([currentFileContent], { type: 'text/plain;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = fullFilename;
    document.body.appendChild(a);
    a.click();

    // 清理
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

// 加载并显示文件
async function loadFile(index) {
    if (index < 0 || index >= fileList.length) return;

    currentIndex = index;
    const filename = fileList[currentIndex];

    try {
        const content = await readFile(filename);
        currentFileContent = content; // 保存当前文件内容
        fileContent.innerHTML = content;

        // 更新选择器
        fileSelector.value = filename;

        // 更新按钮状态
        updateButtonStates();

        // 更新文件信息
        filePosition.textContent = ` | 位置：${currentIndex + 1}/${fileList.length}`;

        const contentStart = document.getElementById('fileContent').offsetTop;
        window.scrollTo({
            top: contentStart - 20,
            behavior: 'smooth'
        });

    } catch (error) {
        showError(error.message);
        downloadBtn.disabled = true;
    }
}

// 更新按钮状态
function updateButtonStates() {
    const currentChapterIndex = chapters.indexOf(currentChapter);
    
    // 上一篇按钮状态
    prevBtn.disabled = (currentIndex <= 0 && currentChapterIndex <= 0);
    
    // 下一篇按钮状态
    nextBtn.disabled = (currentIndex >= fileList.length - 1 && currentChapterIndex >= chapters.length - 1);
    
    // 下载按钮状态
    downloadBtn.disabled = (currentIndex === -1 || !currentFileContent);
}

// 复制到剪贴板函数
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('链接已复制到剪贴板: ' + text);
    }).catch(err => {
        console.error('复制失败:', err);
        // 兼容旧浏览器
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('链接已复制: ' + text);
    });
}

// 文件大小显示
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2) + ' ') + sizes[i];
}

// 显示错误信息
function showError(message) {
    fileContent.innerHTML = `<div class="error">${message}</div>`;
    fileInfo.textContent = '';
    filePosition.textContent = '';
}

// 从URL参数获取文件名
function getFilenameFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const chapterParam = params.get('chapter');
    const fileParam = params.get('file');
    
    if (!chapterParam) return { chapter: null, file: null };
    
    return { 
        chapter: chapterParam, 
        file: fileParam ? parseInt(fileParam) : 0 
    };
}

async function initFileSelector(chapterIndex) {
    if (chapterIndex < 0 || chapterIndex >= chapters.length) {
        console.error('无效的章节索引:', chapterIndex);
        return;
    }

    const zChapterFiles = await fetchFilesForChapter(chapterIndex);
    currentChapter = chapters[chapterIndex];
    fileList = zChapterFiles;

    // 更新章节选择器
    chapterSelector.value = currentChapter;

    // 更新文章选择器
    fileSelector.innerHTML = '<option value="">-- 请选择文章 --</option>';
    fileList.forEach(file => {
        const option = document.createElement('option');
        option.value = file;
        option.textContent = file;
        fileSelector.appendChild(option);
    });
    fileSelector.disabled = false;
}

// 初始化章节选择器
async function initChapterSelector() {
    chapters = await fetchChapters();

    if (chapters.length === 0) {
        chapterSelector.innerHTML = '<option value="">-- 没有可用的章节 --</option>';
        showError('没有可用的章节');
        return;
    }

    chapterSelector.innerHTML = '<option value="">-- 请选择章节 --</option>';

    chapters.forEach(chapter => {
        const option = document.createElement('option');
        option.value = chapter;
        option.textContent = chapter;
        chapterSelector.appendChild(option);
    });

    chapterSelector.disabled = false;

    // 监听章节选择变化
    chapterSelector.addEventListener('change', async (e) => {
        if (!e.target.value) {
            resetFileSelector();
            return;
        }
        
        fileContent.textContent = '正在加载文章列表...';
        const chapterIndex = chapters.indexOf(e.target.value);
        if (chapterIndex !== -1) {
            await initFileSelector(chapterIndex);
            
            // 加载该章节的第一篇文章
            if (fileList.length > 0) {
                fileSelector.value = fileList[0];
                await loadFile(0);
                window.history.replaceState({}, '', `${window.location.pathname}?chapter=${chapters.indexOf(currentChapter)}&file=0`);
            }
        }
    });

    // 监听文章选择变化
    fileSelector.addEventListener('change', async (e) => {
        if (!e.target.value) {
            resetFileSelector();
            window.history.replaceState({}, '', `${window.location.pathname}?chapter=${chapters.indexOf(currentChapter)}`);
            return;
        }
        
        const index = fileList.indexOf(e.target.value);
        if (index !== -1) {
            await loadFile(index);
            window.history.replaceState({}, '', `${window.location.pathname}?chapter=${chapters.indexOf(currentChapter)}&file=${index}`);
        }
    });

    // 获取URL参数并初始化
    const requestedFile = getFilenameFromUrl();
    
    if (requestedFile.chapter !== null) {
        // 检查章节是否存在
        const chapterIndex = requestedFile.chapter;
        if (chapterIndex !== -1) {
            await initFileSelector(chapterIndex);
            
            // 加载指定文章或第一篇文章
            const fileIndex = (requestedFile.file !== null && requestedFile.file < fileList.length) 
                ? requestedFile.file 
                : 0;
                
            if (fileList.length > 0) {
                fileSelector.value = fileList[fileIndex];
                await loadFile(fileIndex);
                window.history.replaceState({}, '', `${window.location.pathname}?chapter=${chapters.indexOf(currentChapter)}&file=${fileIndex}`);
            }
        } else {
            // 章节不存在，加载第一个章节
            await loadFirstChapter();
        }
    } else {
        // 没有URL参数，加载第一个章节
        await loadFirstChapter();
    }
}

// 加载第一个章节
async function loadFirstChapter() {
    if (chapters.length > 0) {
        await initFileSelector(0);
        if (fileList.length > 0) {
            fileSelector.value = fileList[0];
            await loadFile(0);
            window.history.replaceState({}, '', `${window.location.pathname}?chapter=${chapters.indexOf(currentChapter)}&file=0`);
        }
    }
}

// 重置文件选择器状态
function resetFileSelector() {
    fileSelector.innerHTML = '<option value="">-- 请先选择章节 --</option>';
    fileSelector.disabled = true;
    fileContent.textContent = '请选择章节和文章';
    fileInfo.textContent = '';
    filePosition.textContent = '';
    currentIndex = -1;
    currentFileContent = '';
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    downloadBtn.disabled = true;
    shareBtn.style.display = 'none';
}

// 设置分享按钮
function setupShareButton() {
    shareBtn.addEventListener('click', async () => {
        if (currentIndex === -1) return;

        const shareUrl = `${window.location.origin}${window.location.pathname}?chapter=${chapters.indexOf(currentChapter)}&file=${currentIndex}`;
        const title = `分享: ${currentChapter} - ${fileList[currentIndex]}`;

        // 检测是否为移动设备
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (isMobile && navigator.share) {
            // 移动设备调用系统分享
            try {
                await navigator.share({
                    title: title,
                    text: fileList[currentIndex],
                    url: shareUrl
                });
            } catch (err) {
                console.log('分享取消:', err);
                // 分享失败时转为复制链接
                copyToClipboard(shareUrl);
            }
        } else {
            // 桌面设备复制链接
            copyToClipboard(shareUrl);
        }
    });
}
// 字体大小控制功能
function setupFontControls() {
    const fontSmallerBtn = document.getElementById('fontSmallerBtn');
    const fontResetBtn = document.getElementById('fontResetBtn');
    const fontLargerBtn = document.getElementById('fontLargerBtn');
    const fileContent = document.getElementById('fileContent');
    
    const MIN_FONT_SIZE = 12;
    const MAX_FONT_SIZE = 24;
    const DEFAULT_FONT_SIZE = 16;
    
    // 从本地存储获取保存的字体大小
    let currentFontSize = parseInt(localStorage.getItem('fileViewerFontSize')) || DEFAULT_FONT_SIZE;
    
    // 应用字体大小
    function applyFontSize() {
        fileContent.style.fontSize = currentFontSize + 'px';
        localStorage.setItem('fileViewerFontSize', currentFontSize);
        updateButtonStates();
    }
    
    // 更新按钮状态
    function updateButtonStates() {
        fontSmallerBtn.disabled = currentFontSize <= MIN_FONT_SIZE;
        fontLargerBtn.disabled = currentFontSize >= MAX_FONT_SIZE;
    }
    
    // 缩小字体
    fontSmallerBtn.addEventListener('click', () => {
        if (currentFontSize > MIN_FONT_SIZE) {
            currentFontSize -= 1;
            applyFontSize();
        }
    });
    
    // 重置字体
    fontResetBtn.addEventListener('click', () => {
        currentFontSize = DEFAULT_FONT_SIZE;
        applyFontSize();
    });
    
    // 放大字体
    fontLargerBtn.addEventListener('click', () => {
        if (currentFontSize < MAX_FONT_SIZE) {
            currentFontSize += 1;
            applyFontSize();
        }
    });
    
    // 初始化
    applyFontSize();
}

// 在页面加载时初始化字体控制
window.addEventListener('DOMContentLoaded', () => {
    initFileSelector();
    setupShareButton();
    setupFontControls(); // 添加这行
    
    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
});
// 初始化按钮事件
function initButtons() {
    // 下载按钮事件
    downloadBtn.addEventListener('click', downloadCurrentFile);

    // 上一篇按钮事件
    prevBtn.addEventListener('click', async () => {
        if (currentIndex > 0) {
            // 同一章节内的上一篇
            await loadFile(currentIndex - 1);
            window.history.replaceState({}, '', `${window.location.pathname}?chapter=${chapters.indexOf(currentChapter)}&file=${currentIndex}`);
        } else if (currentIndex === 0) {
            // 当前章节的第一篇，需要切换到上一章节的最后一篇
            const currentChapterIndex = chapters.indexOf(currentChapter);
            if (currentChapterIndex > 0) {
                const prevChapterIndex = currentChapterIndex - 1;
                await initFileSelector(prevChapterIndex);

                if (fileList.length > 0) {
                    // 加载上一章节的最后一篇文章
                    const lastFileIndex = fileList.length - 1;
                    fileSelector.value = fileList[lastFileIndex];
                    await loadFile(lastFileIndex);
                    window.history.replaceState({}, '', `${window.location.pathname}?chapter=${chapters.indexOf(currentChapter)}&file=${lastFileIndex}`);
                }
            }
        }
        updateButtonStates();
    });

    // 下一篇按钮事件
    nextBtn.addEventListener('click', async () => {
        if (currentIndex < fileList.length - 1) {
            // 同一章节内的下一篇
            await loadFile(currentIndex + 1);
            window.history.replaceState({}, '', `${window.location.pathname}?chapter=${chapters.indexOf(currentChapter)}&file=${currentIndex}`);
        } else if (currentIndex === fileList.length - 1) {
            // 当前章节的最后一篇，需要切换到下一章节的第一篇
            const currentChapterIndex = chapters.indexOf(currentChapter);
            if (currentChapterIndex < chapters.length - 1) {
                const nextChapterIndex = currentChapterIndex + 1;
                await initFileSelector(nextChapterIndex);

                if (fileList.length > 0) {
                    // 加载下一章节的第一篇文章
                    fileSelector.value = fileList[0];
                    await loadFile(0);
                    window.history.replaceState({}, '', `${window.location.pathname}?chapter=${cchapters.indexOf(currentChapter)}&file=0`);
                }
            }
        }
        updateButtonStates();
    });

    // 键盘快捷键
    document.addEventListener('keydown', async (e) => {
        if (currentIndex === -1) return;

        if (e.key === 'ArrowLeft' && !prevBtn.disabled) {
            e.preventDefault();
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            prevBtn.dispatchEvent(clickEvent);
        } else if (e.key === 'ArrowRight' && !nextBtn.disabled) {
            e.preventDefault();
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            nextBtn.dispatchEvent(clickEvent);
        }
    });

    // 返回顶部按钮
    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', () => {
    initChapterSelector();
    initButtons();
    setupShareButton();

    // 滚动显示/隐藏返回顶部按钮
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                if (window.scrollY > 300) {
                    scrollTopBtn.style.display = 'block';
                } else {
                    scrollTopBtn.style.display = 'none';
                }
                ticking = false;
            });
            ticking = true;
        }
    });
});