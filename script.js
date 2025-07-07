
        // 配置
        const CONFIG = {
            MANIFEST_FILE: 'file-list.json',  // 文件清单JSON路径
            CACHE_BUSTING: true              // 是否添加缓存清除参数
        };

        // 全局变量
        let fileList = [];
        let currentIndex = -1;

        // DOM元素
        const fileSelector = document.getElementById('fileSelector');
        const fileContent = document.getElementById('fileContent');
        const fileInfo = document.getElementById('fileInfo');
        const filePosition = document.getElementById('filePosition');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');

        // 获取文件清单
        async function fetchFileList() {
            try {
                const url = CONFIG.CACHE_BUSTING 
                    ? `${CONFIG.MANIFEST_FILE}?t=${Date.now()}` 
                    : CONFIG.MANIFEST_FILE;
                
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`获取文件列表失败 (HTTP ${response.status})`);
                }
                
                const data = await response.json();
                
                if (!data.files || !Array.isArray(data.files)) {
                    throw new Error('无效的文件清单格式');
                }
                
                return data.files;
            } catch (error) {
                console.error('加载文件清单失败:', error);
                showError('加载文件列表失败: ' + error.message);
                return [];
            }
        }

        // 读取GB18030编码文件
        async function readGB18030File(filename) {
            try {
                fileContent.innerHTML = `<span class="loading"></span>正在加载...`;
                filename=filename+".txt";
                const url = CONFIG.CACHE_BUSTING 
                    ? `${filename}?t=${Date.now()}` 
                    : filename;
                
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`文件加载失败 (HTTP ${response.status})`);
                }
                
                const buffer = await response.arrayBuffer();
                return decoder.decode(buffer);
            } catch (error) {
                console.error('读取文件失败:', error);
                throw new Error(`无法读取文件: ${error.message}`);
            }
        }

        // 加载并显示文件
        async function loadFile(index) {
            if (index < 0 || index >= fileList.length) return;
            
            currentIndex = index;
            const filename = fileList[currentIndex];
            
            try {
                const content = await readGB18030File(filename);
                fileContent.textContent = content;
                
                // 更新文件信息
                fileInfo.textContent = `当前位置: ${filename}`;
                filePosition.textContent = `${currentIndex + 1}/${fileList.length}`;
                
                // 更新选择器
                fileSelector.value = filename;
                
                // 更新按钮状态
                prevBtn.disabled = currentIndex <= 0;
                nextBtn.disabled = currentIndex >= fileList.length - 1;
                
            } catch (error) {
                showError(error.message);
            }
        }

        // 显示错误信息
        function showError(message) {
            fileContent.innerHTML = `<div class="error">${message}</div>`;
            fileInfo.textContent = '';
            filePosition.textContent = '';
        }

        // 初始化文件选择器
        async function initFileSelector() {
            fileList = await fetchFileList();
            
            if (fileList.length === 0) {
                fileSelector.innerHTML = '<option value="">-- 没有可用的文件 --</option>';
                showError('文件清单中没有可用的文本文件');
                return;
            }
            
            fileSelector.innerHTML = '<option value="">-- 请选择 --</option>';
            
            fileList.forEach(file => {
                const option = document.createElement('option');
                option.value = file;
                option.textContent = file;
                fileSelector.appendChild(option);
            });
            
            fileSelector.disabled = false;
            
            // 监听选择变化
            fileSelector.addEventListener('change', (e) => {
                if (!e.target.value) {
                    fileContent.textContent = '请选择';
                    fileInfo.textContent = '';
                    filePosition.textContent = '';
                    currentIndex = -1;
                    prevBtn.disabled = true;
                    nextBtn.disabled = true;
                    return;
                }
                
                const index = fileList.indexOf(e.target.value);
                if (index !== -1) loadFile(index);
            });
            
            // 上一个按钮事件
            prevBtn.addEventListener('click', () => {
                if (currentIndex > 0) loadFile(currentIndex - 1);
            });
            
            // 下一个按钮事件
            nextBtn.addEventListener('click', () => {
                if (currentIndex < fileList.length - 1) loadFile(currentIndex + 1);
            });
            
            // 键盘快捷键
            document.addEventListener('keydown', (e) => {
                if (currentIndex === -1) return;
                
                if (e.key === 'ArrowLeft' && !prevBtn.disabled) {
                    loadFile(currentIndex - 1);
                } else if (e.key === 'ArrowRight' && !nextBtn.disabled) {
                    loadFile(currentIndex + 1);
                }
            });
        }

        // 页面加载完成后初始化
        window.addEventListener('DOMContentLoaded', initFileSelector);