
// 创建选项按钮
// 控制按钮文字切换
const dataLabel = {
    A:"ID TDSIEC20001",
    B:"ID TDSIEC10004"
}

const selectionOptions = {
    A: {
        title: dataLabel.A,
        choices: {
            speed: "Speed",
            volume: "Volume"
        }
    },
    B: {
        title: dataLabel.B,
        choices: {
            speed: "Speed",
            volume: "Volume"
        }
    }
};

// 初始值设为 1（滑块默认值）
let selectionData = {
    A: { speed: 1, volume: 1 },
    B: { speed: 1, volume: 1 }
};

function generateSelectionPanel() {
    const panel = document.getElementById("selection-panel");
    panel.innerHTML = "";

    Object.keys(selectionOptions).forEach(groupKey => {
        const group = selectionOptions[groupKey];

        // 添加标题分隔线
        const groupTitle = document.createElement("div");
        groupTitle.className = "group-title";
        groupTitle.textContent = group.title;
        panel.appendChild(groupTitle);

        const groupRow = document.createElement("div");
        groupRow.className = "group-row";

        Object.keys(group.choices).forEach(type => {
            const typeTitle = group.choices[type];

            const row = document.createElement("div");
            row.classList.add("selection-row");

            const label = document.createElement("label");
            label.textContent = `${group.title} - ${typeTitle}`;

            const input = document.createElement("input");
            input.type = "range";
            input.min = 0.5;
            input.max = 1.7;
            input.step = 0.01;
            input.value = 1;
            input.dataset.group = groupKey;
            input.dataset.type = type;

            const valueText = document.createElement("span");
            valueText.className = "slider-value";
            valueText.textContent = parseFloat(input.value).toFixed(2);

            input.addEventListener("input", () => {
                const val = parseFloat(input.value);
                selectionData[groupKey][type] = val;
                valueText.textContent = val.toFixed(2);

                // 滑块更新数据
                const event = new CustomEvent("selectionUpdate", {
                    detail: { selectionData }
                });
                window.dispatchEvent(event);
            });

            row.appendChild(label);
            row.appendChild(input);
            row.appendChild(valueText);
            groupRow.appendChild(row);
        });

        panel.appendChild(groupRow);
    });

    // 添加 Reset 按钮
    const resetButton = document.createElement("button");
    resetButton.className = "selection-button reset";
    resetButton.textContent = "Reset";

    resetButton.addEventListener("click", () => {
        selectionData = {
            A: { speed: 1, volume: 1 },
            B: { speed: 1, volume: 1 }
        };
        document.querySelectorAll("input[type=range]").forEach(input => {
            input.value = 1;
            const valueSpan = input.nextElementSibling;
            if (valueSpan) {
                valueSpan.textContent = parseFloat(input.value).toFixed(2);
            }
        });

        // Reset 触发更新
        const event = new CustomEvent("selectionUpdate", {
            detail: { selectionData }
        });
        window.dispatchEvent(event);
    });

    panel.appendChild(resetButton);
}

// 折叠面板按钮逻辑
document.getElementById("toggle-selection").addEventListener("click", function () {
    const container = document.getElementById("user-selection-container");
    container.classList.toggle("expanded");
    this.textContent = container.classList.contains("expanded")
        ? "Close Settings Panel"
        : "Open Settings Panel";
});

// 
//   window.addEventListener("selectionUpdate", e => {
//     console.log("📡 滑块更新:", e.detail.selectionData);
//   });

generateSelectionPanel();

// 切换左侧输入窗口
// 切换左侧输入窗口
document.getElementById('toggle-input-button').addEventListener('click', function () {
    const inputWindow = document.getElementById('input-window');
    const isHidden = inputWindow.style.display === 'none' || inputWindow.style.display === '';

    if (isHidden) {
        inputWindow.style.display = 'flex'; // 保证 Flex 布局正常应用

        // 触发一次重绘，避免首次显示时排版错乱
        requestAnimationFrame(() => {
            inputWindow.scrollTop = 0;
        });

        this.innerText = 'Close Input Window';
    } else {
        inputWindow.style.display = 'none';
        this.innerText = 'Data Input Window';
    }
});

const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const textarea = document.getElementById('dataInput');
const statusMessage = document.getElementById('statusMessage');

// 处理文件读取
function handleFile(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const json = JSON.parse(e.target.result);
            textarea.value = JSON.stringify(json, null, 2); // 美化格式
            statusMessage.textContent = 'JSON file loaded successfully.';
            statusMessage.style.color = 'green';
        } catch (err) {
            statusMessage.textContent = 'Invalid JSON file.';
            statusMessage.style.color = 'red';
        }
    };
    reader.readAsText(file);
}

// 文件选择
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

// 拖拽上传
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
    }
});

// 切换右侧数据窗口
const dataWindow = document.getElementById('data-window');
document.getElementById('toggle-data-button').addEventListener('click', function () {
    if (dataWindow.style.display === 'none') {
        dataWindow.style.display = 'block';
        this.innerText = 'Close Window';
    } else {
        dataWindow.style.display = 'none';
        this.innerText = 'Data Chart';
    }
});

// 初始化时隐藏数据窗口
dataWindow.style.display = 'none';

window.processData = function () {
    const input = document.getElementById('dataInput').value;
    try {
        const inputData = JSON.parse(input); // 解析 JSON
        document.getElementById('statusMessage').innerText = "Format correct, analyzing data ...";

        // const url = 'http://127.0.0.1:5000/process'; // 本地后端地址
        const url = 'https://fpyproj-backend.onrender.com/process'; // 线上后端地址
        // 发送 JSON 到后端
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(inputData)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error, error status: ${response.status}`);
                }
                return response.json(); // 解析 JSON
            })
            .then(result => {
                if (result.error) {
                    document.getElementById('statusMessage').innerText = result.error;
                    const event = new CustomEvent("dataInputed", { detail: {} });
                    window.dispatchEvent(event);
                } else {
                    document.getElementById('statusMessage').innerText = "Data Processed Successfully!";
                    // 获取所有键（ID）
                    const allKeys = Object.keys(result.results);
                    // console.log("发现的后端 ID:", allKeys);
                    dataLabel.A = allKeys[0];
                    dataLabel.B = allKeys[1];
                    const event = new CustomEvent("dataInputed", { detail: result });
                    window.dispatchEvent(event);
                }
            })
            .catch(error => {
                document.getElementById('statusMessage').innerText = "Server Error: " + error.message;
            });

    } catch (error) {
        document.getElementById('statusMessage').innerText = "JSON format error!";
    }
}

// 初始化折线图的变量
let chart;
function updateChartData(newData) {
    const allKeys = Object.keys(newData.occupancyTimeSeriesUsed);
    const timeSeriesA = newData.occupancyTimeSeriesUsed[allKeys[0]]; 
    const timeSeriesB = newData.occupancyTimeSeriesUsed[allKeys[1]]; 

    const labels = Array.from({ length: timeSeriesA.length }, (_, i) => `Point ${i + 1}`);

    if (chart) {
        chart.data.labels = labels; 
        chart.data.datasets[0].data = timeSeriesA; 
        chart.data.datasets[1].data = timeSeriesB; 
        chart.data.datasets[0].label = dataLabel.A;
        chart.data.datasets[1].label = dataLabel.B;
        
        chart.options.scales.x.title.text = `Data Points`; 
        chart.options.scales.y.title.text = `Data Value`;
        chart.update(); 
    }
}

// 监听 "dataReady" 事件
window.addEventListener("dataReady", (event) => {
    const receivedData = event.detail; 

    // Extract data fields
    const rawLyap = receivedData.rawLyap || {};
    const normalizedLyap = receivedData.normalizedLyap || {};
    const averageAlignment = receivedData.averageAlignment || {};
    const averageDistance = receivedData.averageDistance || {};

    // Update the display area (#data-content)
    const dataContentElement = document.getElementById('data-content');
    dataContentElement.innerHTML = `
        <div class="data-section">
            <h4 class="data-title">Raw Lyapunov:</h4>
            <div class="data-content">
                ${Object.entries(rawLyap).map(([id, value]) => {
        const formattedValue = (typeof value === "number" ? value.toFixed(3) : "N/A");
        return `<span><strong>ID ${id}:</strong> ${formattedValue}</span>`;
    }).join("")}
            </div>
        </div>
        <div class="data-section">
            <h4 class="data-title">Normalized Lyapunov:</h4>
            <div class="data-content">
                ${Object.entries(normalizedLyap).map(([id, value]) => {
        const formattedValue = (typeof value === "number" ? value.toFixed(3) : "N/A");
        return `<span><strong>ID ${id}:</strong> ${formattedValue}</span>`;
    }).join("")}
            </div>
        </div>
        <div class="data-section">
            <h4 class="data-title">Average Alignment:</h4>
            <div class="data-content">
                ${Object.entries(averageAlignment).map(([id, value]) => {
        const formattedValue = (typeof value === "string" ? value : "N/A");
        return `<span><strong>ID ${id}:</strong> ${formattedValue}</span>`;
    }).join("")}
            </div>
        </div>
        <div class="data-section">
            <h4 class="data-title">Average Distance:</h4>
            <div class="data-content">
                ${Object.entries(averageDistance).map(([id, value]) => {
        const formattedValue = (typeof value === "number" ? value.toFixed(3) : "N/A");
        return `<span><strong>ID ${id}:</strong> ${formattedValue}</span>`;
    }).join("")}
            </div>
        </div>
    `;

    // Update the chart data
    updateChartData(receivedData);
    generateSelectionPanel();
});

// 初始化折线图
const ctx = document.getElementById('line-chart').getContext('2d');
chart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [], 
        datasets: [
            {
                label: dataLabel.A,
                data: [], 
                borderColor: 'rgb(99, 115, 255)',
                backgroundColor: 'rgba(99, 115, 255, 0.69)',
                borderWidth: 2,
                fill: true
            },
            {
                label: dataLabel.B,
                data: [], 
                borderColor: 'rgb(255, 242, 54)',
                backgroundColor: 'rgba(255, 242, 54, 0.2)',
                borderWidth: 2,
                fill: true
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top'
            }
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Data Points (30 seconds each)' 
                }
            },
            y: {
                title: {
                    display: true,
                    text: 'Occupancy Rate (%)'
                },
                suggestedMin: 0,
                suggestedMax: 100 
            }
        }
    }
});