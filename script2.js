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
        const manifestFile = `${chapter}.json`;
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
async function readFile(chapter, filename) {
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
async function loadFile(chapter, index) {
    if (index < 0 || index >= fileList.length) return;

    currentIndex = index;
    const filename = fileList[currentIndex];

    try {
        const content = await readFile(chapter, filename);
        currentFileContent = content; // 保存当前文件内容
        fileContent.innerHTML = content;

        // 更新选择器
        fileSelector.value = filename;

        // 更新按钮状态
        if (currentIndex <= 0)
            prevBtn.disabled = chapters.indexOf(currentChapter) <= 0;
        else
            prevBtn.disabled = false;
        if (currentIndex >= fileList.length - 1)
            nextBtn.disabled = chapters.indexOf(currentChapter) >= chapters.length - 1;
        else
            nextBtn.disabled = false;
        downloadBtn.disabled = false;

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

//文件大小显示
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
    if(!chapterParam && !fileParam) return null;
    if (!chapterParam) return null;
    if (!fileParam) {
        initFileSelector(chapterParam)
        fileParam = fileList[0];
    }

    return { chapter: chapterParam, file: fileParam };
}

async function initFileSelector(chapter) {

    const zChapterFiles = await fetchFilesForChapter(chapter);
    chapterSelector.value = chapter;
    currentChapter = chapter;
    fileList = zChapterFiles;

    // 更新文章选择器
    fileSelector.innerHTML = '<option value="">-- 请选择文章 --</option>';
    fileList.forEach(file => {
        const option = document.createElement('option');
        option.value = file;
        option.textContent = file;
        fileSelector.appendChild(option);
    });
    fileSelector.disabled = false;
    // 加载章节的第一篇文章
    const zFileIndex = 0
    const zFile = fileList[zFileIndex];
    fileSelector.value = zFile;
    loadFile(chapter, zFileIndex);
    window.history.replaceState({}, '', `${window.location.pathname}?chapter=${chapter}&file=${zFile}`);
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
            fileSelector.innerHTML = '<option value="">-- 请先选择章节 --</option>';
            fileSelector.disabled = true;
            fileContent.textContent = '请选择章节和文章';
            fileInfo.textContent = '';
            filePosition.textContent = '';
            currentIndex = -1;
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            downloadBtn.disabled = true;
            shareBtn.style.display = 'none';
            window.history.replaceState({}, '', window.location.pathname);
            return;
        }
        fileContent.textContent = '请选择文章';
        currentChapter = e.target.value;
        await initFileSelector(currentChapter);

        // 获取URL参数
        const requestedFile = getFilenameFromUrl();
        if (requestedFile && requestedFile.chapter === currentChapter) {
            // 检查文件是否存在列表中
            const index = fileList.indexOf(requestedFile.file);
            if (index !== -1)
                // 自动加载请求的文件
                fileSelector.value = requestedFile.file;
            else {
                fileSelector.value = fileList[0];
                index = 0;
            }
            loadFile(currentChapter, index);
            window.history.replaceState({}, '', `${window.location.pathname}?chapter=${currentChapter}&file=${requestedFile.file}`);
        }
    });

    // 监听文章选择变化
    fileSelector.addEventListener('change', (e) => {
        if (!e.target.value) {
            fileContent.textContent = '请选择文章';
            fileInfo.textContent = '';
            filePosition.textContent = '';
            currentIndex = -1;
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            downloadBtn.disabled = true;
            shareBtn.style.display = 'none';
            window.history.replaceState({}, '', `${window.location.pathname}?chapter=${currentChapter}`);
            return;
        }
        const index = fileList.indexOf(e.target.value);
        if (index !== -1) {
            loadFile(currentChapter, index);
            window.history.replaceState({}, '', `${window.location.pathname}?chapter=${currentChapter}&file=${e.target.value}`);
        }
        else {
            loadFile(currentChapter, 0);
            window.history.replaceState({}, '', `${window.location.pathname}?chapter=${currentChapter}&file=${fileList[0]}`);
        }
    });
    // 获取URL参数
    const requestedFile = getFilenameFromUrl();
    if (requestedFile) {
        // 检查章节是否存在
        const chapterIndex = chapters.indexOf(requestedFile.chapter);
        if (chapterIndex !== -1) {
            // 自动选择章节
            chapterSelector.value = requestedFile.chapter;
            // 触发change事件加载文章列表
            chapterSelector.dispatchEvent(new Event('change'));
        }
        else {
            const zChapter = chapters[0];
            const zChapterFiles = await fetchFilesForChapter(zChapter);
            // 切换到第一章节
            chapterSelector.value = zChapter;
            currentChapter = zChapter;
            fileList = zChapterFiles;

            // 更新文章选择器
            fileSelector.innerHTML = '<option value="">-- 请选择文章 --</option>';
            fileList.forEach(file => {
                const option = document.createElement('option');
                option.value = file;
                option.textContent = file;
                fileSelector.appendChild(option);
            });

            // 加载第一章节的第一篇文章
            const zFileIndex = 0
            const zFile = fileList[zFileIndex];
            fileSelector.value = zFile;
            loadFile(zChapter, zFileIndex);
            window.history.replaceState({}, '', `${window.location.pathname}?chapter=${zChapter}&file=${zFile}`);
        }
    }
    else {
        await initFileSelector(0);
        chapterSelector.value = chapters[0];
        chapterSelector.dispatchEvent(new Event('change'));
    }
}

// 设置分享按钮
function setupShareButton() {
    shareBtn.addEventListener('click', async () => {
        if (currentIndex === -1) return;

        const filename = fileList[currentIndex];
        const shareUrl = `${window.location.origin}${window.location.pathname}?chapter=${currentChapter}&file=${filename}`;
        const title = `分享: ${currentChapter} - ${filename}`;

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

// 初始化按钮事件
function initButtons() {
    // 下载按钮事件
    downloadBtn.addEventListener('click', downloadCurrentFile);

    // 上一篇按钮事件
    prevBtn.addEventListener('click', async () => {
        if (currentIndex > 0) {
            // 同一章节内的上一篇
            const prevFile = fileList[currentIndex - 1];
            fileSelector.value = prevFile;
            loadFile(currentChapter, currentIndex - 1);
            window.history.replaceState({}, '', `${window.location.pathname}?chapter=${currentChapter}&file=${prevFile}`);
        } else if (currentIndex === 0) {
            // 当前章节的第一篇，需要切换到上一章节的最后一篇
            const currentChapterIndex = chapters.indexOf(currentChapter);
            if (currentChapterIndex > 0) {
                const prevChapter = chapters[currentChapterIndex - 1];
                const prevChapterFiles = await fetchFilesForChapter(prevChapter);

                if (prevChapterFiles.length > 0) {
                    // 切换到上一章节
                    chapterSelector.value = prevChapter;
                    currentChapter = prevChapter;
                    fileList = prevChapterFiles;

                    // 更新文章选择器
                    fileSelector.innerHTML = '<option value="">-- 请选择文章 --</option>';
                    fileList.forEach(file => {
                        const option = document.createElement('option');
                        option.value = file;
                        option.textContent = file;
                        fileSelector.appendChild(option);
                    });

                    // 加载上一章节的最后一篇文章
                    const lastFileIndex = fileList.length - 1;
                    const lastFile = fileList[lastFileIndex];
                    fileSelector.value = lastFile;
                    loadFile(prevChapter, lastFileIndex);
                    window.history.replaceState({}, '', `${window.location.pathname}?chapter=${prevChapter}&file=${lastFile}`);
                }
            }
        }
    });

    // 下一篇按钮事件
    nextBtn.addEventListener('click', async () => {
        if (currentIndex < fileList.length - 1) {
            // 同一章节内的下一篇
            const nextFile = fileList[currentIndex + 1];
            fileSelector.value = nextFile;
            loadFile(currentChapter, currentIndex + 1);
            window.history.replaceState({}, '', `${window.location.pathname}?chapter=${currentChapter}&file=${nextFile}`);
        } else if (currentIndex === fileList.length - 1) {
            // 当前章节的最后一篇，需要切换到下一章节的第一篇
            const currentChapterIndex = chapters.indexOf(currentChapter);
            if (currentChapterIndex < chapters.length - 1) {
                const nextChapter = chapters[currentChapterIndex + 1];
                const nextChapterFiles = await fetchFilesForChapter(nextChapter);

                if (nextChapterFiles.length > 0) {
                    // 切换到下一章节
                    chapterSelector.value = nextChapter;
                    currentChapter = nextChapter;
                    fileList = nextChapterFiles;

                    // 更新文章选择器
                    fileSelector.innerHTML = '<option value="">-- 请选择文章 --</option>';
                    fileList.forEach(file => {
                        const option = document.createElement('option');
                        option.value = file;
                        option.textContent = file;
                        fileSelector.appendChild(option);
                    });

                    // 加载下一章节的第一篇文章
                    const firstFile = fileList[0];
                    fileSelector.value = firstFile;
                    loadFile(nextChapter, 0);
                    window.history.replaceState({}, '', `${window.location.pathname}?chapter=${nextChapter}&file=${firstFile}`);
                }
            }
        }
    });

    // 键盘快捷键
    document.addEventListener('keydown', async (e) => {
        if (currentIndex === -1) return;

        if (e.key === 'ArrowLeft' && !prevBtn.disabled) {
            // 模拟点击上一篇按钮
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            prevBtn.dispatchEvent(clickEvent);
        } else if (e.key === 'ArrowRight' && !nextBtn.disabled) {
            // 模拟点击下一篇按钮
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