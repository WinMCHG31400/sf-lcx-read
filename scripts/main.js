const CONFIG = {
    MANIFEST_FILE: 'datas.json',
    CACHE_BUSTING: true
};

let datas = [];
let currentIndex = -1;
let currentFileContent = '';

const fileSelector = document.getElementById('fileSelector');
const fileContent = document.getElementById('fileContent');
const fileInfo = document.getElementById('fileInfo');
const filePosition = document.getElementById('filePosition');
const timeInfo = document.getElementById('timeInfo');
const nameInfo = document.getElementById('nameInfo');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const downloadBtn = document.getElementById('downloadBtn');
const shareBtn = document.getElementById('shareBtn');
const scrollTopBtn = document.getElementById('scrollTopBtn');

//加载数据
async function fetchData() {
    try {
        const url = CONFIG.CACHE_BUSTING
            ? `${CONFIG.MANIFEST_FILE}?t=${Date.now()}`
            : CONFIG.MANIFEST_FILE;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`获取数据失败 (HTTP ${response.status})`);
        }

        const data = await response.json();

        if (!data.datas || !Array.isArray(data.datas)) {
            throw new Error('无效的数据格式');
        }

        return data.datas;
    } catch (error) {
        console.error('加载数据失败:', error);
        showError('加载数据失败: ' + error.message);
        return [];
    }
}

//读取内容
async function readFile(filename) {
    try {
        fileContent.innerHTML = `<span class="loading"></span>正在加载文件...`;
        filename = filename + ".txt";
        const url = CONFIG.CACHE_BUSTING
            ? `${filename}?t=${Date.now()}`
            : filename;
        console.log('Fetching file:', url);
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

//下载内容
function downloadCurrentFile() {
    if (currentIndex === -1 || !currentFileContent) return;

    const fileData = datas[currentIndex];
    const filename = fileData.name + ".txt";
    const blob = new Blob([currentFileContent], { type: 'text/plain;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

// 加载并显示文件
async function loadFile(index) {
    if (index < 0 || index >= datas.length) return;

    currentIndex = index;
    const fileData = datas[currentIndex];
    const filename = fileData.id;

    try {
        const content = await readFile(filename);
        currentFileContent = content;
        fileContent.innerHTML = content;

        fileSelector.value = fileData.id;

        prevBtn.disabled = currentIndex <= 0;
        nextBtn.disabled = currentIndex >= datas.length - 1;
        downloadBtn.disabled = false;
        shareBtn.disabled = false;

        filePosition.textContent = ` | 位置：${currentIndex + 1}/${datas.length}`;
        timeInfo.textContent = `发表时间：${datas[currentIndex].time}`;
        nameInfo.textContent = datas[currentIndex].alias?`| 别名：${datas[currentIndex].alias}`:''

        const contentStart = document.getElementById('fileContent').offsetTop;
        window.scrollTo({
            top: contentStart - 20,
            behavior: 'smooth'
        });

    } catch (error) {
        showError(error.message);
        downloadBtn.disabled = true;
        shareBtn.disabled = true;
    }
}

// 复制到剪贴板函数
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('链接已复制到剪贴板: ' + text);
    }).catch(err => {
        console.error('复制失败:', err);
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('链接已复制: ' + text);
    });
}

//显示文件大小
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

// 从URL获取参数
function getFilenameFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const fileParam = params.get('p');
    return fileParam;
}

// 根据id查找索引
function findIndexById(id) {
    return datas.findIndex(item => item.id === id);
}

// 初始化文件选择器
async function initFileSelector() {
    datas = await fetchData();

    if (datas.length === 0) {
        fileSelector.innerHTML = '<option value="">-- 没有可用的内容 --</option>';
        showError('没有可用的内容');
        return;
    }

    fileSelector.innerHTML = '<option value="">-- 请选择 --</option>';

    datas.forEach(file => {
        const option = document.createElement('option');
        option.value = file.id;
        option.textContent = file.name;
        fileSelector.appendChild(option);
    });

    fileSelector.disabled = false;

    // 获取URL参数
    const requestedFileId = getFilenameFromUrl();
    if (requestedFileId) {
        const index = findIndexById(requestedFileId);
        if (index !== -1) {
            loadFile(index);
        } else {
            // 如果参数无效，加载第一个文件
            loadFile(0);
            window.history.replaceState({}, '', `${window.location.pathname}?p=${datas[0].id}`);
        }
    } else {
        // 如果没有参数，加载第一个文件
        loadFile(0);
        window.history.replaceState({}, '', `${window.location.pathname}?p=${datas[0].id}`);
    }

    // 监听选择变化
    fileSelector.addEventListener('change', (e) => {
        if (!e.target.value) {
            fileContent.textContent = '请选择';
            fileInfo.textContent = '';
            filePosition.textContent = '';
            currentIndex = -1;
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            downloadBtn.disabled = true;
            shareBtn.disabled = true;
            window.history.replaceState({}, '', window.location.pathname);
            return;
        }
        const index = findIndexById(e.target.value);
        if (index !== -1) {
            window.history.replaceState({}, '', `${window.location.pathname}?p=${datas[index].id}`);
            loadFile(index);
        }
    });

    // 上一个按钮事件
    prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
            window.history.replaceState({}, '', `${window.location.pathname}?p=${datas[currentIndex - 1].id}`);
            loadFile(currentIndex - 1);
        }
    });

    // 下载按钮事件
    downloadBtn.addEventListener('click', downloadCurrentFile);

    // 下一个按钮事件
    nextBtn.addEventListener('click', () => {
        if (currentIndex < datas.length - 1) {
            window.history.replaceState({}, '', `${window.location.pathname}?p=${datas[currentIndex + 1].id}`);
            loadFile(currentIndex + 1);
        }
    });

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
        if (currentIndex === -1) return;

        if (e.key === 'ArrowLeft' && !prevBtn.disabled) {
            window.history.replaceState({}, '', `${window.location.pathname}?p=${datas[currentIndex - 1].id}`);
            loadFile(currentIndex - 1);
        } else if (e.key === 'ArrowRight' && !nextBtn.disabled) {
            window.history.replaceState({}, '', `${window.location.pathname}?p=${datas[currentIndex + 1].id}`);
            loadFile(currentIndex + 1);
        }
    });
}

let ticking = false;
window.addEventListener('scroll', () => {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            toggleScrollTopButton();
            ticking = false;
        });
        ticking = true;
    }
});

// 字体大小控制功能
function setupFontControls() {
    const fontSmallerBtn = document.getElementById('fontSmallerBtn');
    const fontResetBtn = document.getElementById('fontResetBtn');
    const fontLargerBtn = document.getElementById('fontLargerBtn');
    const fileContent = document.getElementById('fileContent');

    const MIN_FONT_SIZE = 6;
    const MAX_FONT_SIZE = 40;
    const DEFAULT_FONT_SIZE = 16;

    let currentFontSize = parseInt(localStorage.getItem('fileViewerFontSize')) || DEFAULT_FONT_SIZE;

    function applyFontSize() {
        fileContent.style.fontSize = currentFontSize + 'px';
        localStorage.setItem('fileViewerFontSize', currentFontSize);
        updateButtonStates();
    }

    function updateButtonStates() {
        fontSmallerBtn.disabled = currentFontSize <= MIN_FONT_SIZE;
        fontLargerBtn.disabled = currentFontSize >= MAX_FONT_SIZE;
    }

    fontSmallerBtn.addEventListener('click', () => {
        if (currentFontSize > MIN_FONT_SIZE) {
            currentFontSize -= 1;
            applyFontSize();
        }
    });

    fontResetBtn.addEventListener('click', () => {
        currentFontSize = DEFAULT_FONT_SIZE;
        applyFontSize();
    });

    fontLargerBtn.addEventListener('click', () => {
        if (currentFontSize < MAX_FONT_SIZE) {
            currentFontSize += 1;
            applyFontSize();
        }
    });

    applyFontSize();
}

function setupShareButton() {
    shareBtn.addEventListener('click', async () => {
        if (currentIndex === -1) return;

        const fileData = datas[currentIndex];
        const shareUrl = `${window.location.origin}${window.location.pathname}?p=${fileData.id}`;
        const title = `分享: ${fileData.name}`;

        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (isMobile && navigator.share) {
            try {
                await navigator.share({
                    title: title,
                    text: fileData.name,
                    url: shareUrl
                });
            } catch (err) {
                console.log('分享取消:', err);
                copyToClipboard(shareUrl);
            }
        } else {
            copyToClipboard(shareUrl);
        }
    });
}

// 显示/隐藏按钮函数
function toggleScrollTopButton() {
    if (scrollTopBtn) {
        if (window.scrollY > 300)
            scrollTopBtn.style.display = 'block';
        else
            scrollTopBtn.style.display = 'none';
    }
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', () => {
    initFileSelector();
    setupShareButton();
    setupFontControls();
    
    if (scrollTopBtn) {
        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
});