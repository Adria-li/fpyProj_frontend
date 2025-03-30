// // 定义选项数据
// const selectionOptions = {
//     A: {
//         title: "Group A",
//         choices: {
//             speed: "Speed",
//             volume: "Volume"
//         }
//     },
//     B: {
//         title: "Group B",
//         choices: {
//             speed: "Speed",
//             volume: "Volume"
//         }
//     }
// };

// let selectionData = {
//     A: { speed: null, volume: null },
//     B: { speed: null, volume: null }
// };

// // 生成选项界面
// function generateSelectionPanel() {
//     const panel = document.getElementById("selection-panel");
//     panel.innerHTML = ""; // Clear content

//     Object.keys(selectionOptions).forEach(groupKey => {
//         const group = selectionOptions[groupKey];

//         Object.keys(group.choices).forEach(type => {
//             const typeTitle = group.choices[type];
//             const row = document.createElement("div");
//             row.classList.add("selection-row");

//             const label = document.createElement("span");
//             label.textContent = `${group.title} - ${typeTitle}: `;

//             const bigButton = createOptionButton(groupKey, type, "big", "Big");
//             const smallButton = createOptionButton(groupKey, type, "small", "Small");

//             row.appendChild(label);
//             row.appendChild(bigButton);
//             row.appendChild(smallButton);

//             panel.appendChild(row);
//         });
//     });

//     // 创建 Reset 按钮
//     const resetButton = document.createElement("button");
//     resetButton.classList.add("selection-button", "reset");
//     resetButton.textContent = "Reset";

//     // 监听 Reset 按钮点击事件
//     resetButton.addEventListener("click", function () {
//         console.log("🔄 Resetting selection...");

//         // 设置所有选项为 null
//         selectionData = {
//             A: { speed: null, volume: null },
//             B: { speed: null, volume: null }
//         };

//         // 取消所有选中的按钮
//         document.querySelectorAll(".option").forEach(btn => btn.classList.remove("selected"));

//         // 触发 selectionUpdate 事件，通知 UI 选项被重置
//         const event = new CustomEvent("selectionUpdate", {
//             detail: { selectionData }
//         });
//         window.dispatchEvent(event);

//         // 更新 Confirm 按钮状态
//         checkIfReady();

//         console.log("✅ Selection reset and submitted:", selectionData);
//     });

//     // Add confirm button
//     const confirmButton = document.createElement("button");
//     confirmButton.classList.add("selection-button", "confirm");
//     confirmButton.id = "confirm-selection";
//     confirmButton.textContent = "Confirm";
//     confirmButton.disabled = true;

//     confirmButton.addEventListener("click", function () {
//         console.log("Submitting data:", selectionData);

//         // 触发前端监听事件，通知 UI 更新
//         const event = new CustomEvent("selectionUpdate", {
//             detail: { selectionData }
//         });
//         window.dispatchEvent(event);

//         // Close selection panel
//         document.getElementById("user-selection-container").classList.remove("expanded");

//         // Reset selection state
//         // selectionData = {
//         //     A: { speed: null, volume: null },
//         //     B: { speed: null, volume: null }
//         // };

//         document.querySelectorAll(".option").forEach(btn => btn.classList.remove("selected"));
//         checkIfReady();
//     });

//     panel.appendChild(resetButton); 
//     panel.appendChild(confirmButton);
// }

// 创建选项按钮
// 控制按钮文字切换
const selectionOptions = {
    A: {
      title: "Group A",
      choices: {
        speed: "Speed",
        volume: "Volume"
      }
    },
    B: {
      title: "Group B",
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
  
          // ✅ 实时触发事件
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
  
      // ✅ Reset 也触发一次事件
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
      ? "关闭设置面板"
      : "打开设置面板";
  });
  
  // ✅ 监听实时滑块数据变化
  window.addEventListener("selectionUpdate", e => {
    console.log("📡 滑块更新:", e.detail.selectionData);
  });
  
  generateSelectionPanel();

// 切换左侧输入窗口
document.getElementById('toggle-input-button').addEventListener('click', function () {
    const inputWindow = document.getElementById('input-window');
    if (inputWindow.style.display === 'none') {
        inputWindow.style.display = 'block';
        this.innerText = '隐藏输入窗口';
    } else {
        inputWindow.style.display = 'none';
        this.innerText = '显示输入窗口';
    }
});

// 切换右侧数据窗口
const dataWindow = document.getElementById('data-window');
document.getElementById('toggle-data-button').addEventListener('click', function () {
    if (dataWindow.style.display === 'none') {
        dataWindow.style.display = 'block';
        this.innerText = '隐藏数据窗口';
    } else {
        dataWindow.style.display = 'none';
        this.innerText = '显示数据窗口';
    }
});

// 初始化时隐藏数据窗口
dataWindow.style.display = 'none';

window.processData = function () {
    const input = document.getElementById('dataInput').value;
    try {
        const inputData = JSON.parse(input); // 解析 JSON
        document.getElementById('statusMessage').innerText = "✅ 数据解析成功，正在发送...";

        // 发送 JSON 到后端
        fetch('http://localhost:5000/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(inputData)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP 错误！状态码: ${response.status}`);
                }
                return response.json(); // 解析 JSON
            })
            .then(result => {
                if (result.error) {
                    document.getElementById('statusMessage').innerText = "❌ " + result.error;
                    const event = new CustomEvent("dataInputed", { detail: {} });
                    window.dispatchEvent(event);
                } else {
                    document.getElementById('statusMessage').innerText = "✅ 处理成功";
                    // 获取所有键（ID）
                    const allKeys = Object.keys(result.results);
                    console.log("🔍 发现的后端 ID:", allKeys);
                    selectionOptions.A.title = allKeys[0];
                    selectionOptions.B.title = allKeys[1];
                    const event = new CustomEvent("dataInputed", { detail: result });
                    window.dispatchEvent(event);
                }
            })
            .catch(error => {
                document.getElementById('statusMessage').innerText = "❌ 1请求失败";
            });

    } catch (error) {
        document.getElementById('statusMessage').innerText = "❌ JSON 格式错误";
    }
}

// 初始化折线图的变量
let chart;

// 更新折线图数据的函数
function updateChartData(newData) {
    const allKeys = Object.keys(newData.occupancyTimeSeriesUsed);
    const timeSeriesA = newData.occupancyTimeSeriesUsed[allKeys[0]]; // ID 为 A 的数据
    const timeSeriesB = newData.occupancyTimeSeriesUsed[allKeys[1]]; // ID 为 B 的数据

    // 生成横轴标签 (按数据点计数)
    const labels = Array.from({ length: timeSeriesA.length }, (_, i) => `Point ${i + 1}`);

    if (chart) {
        chart.data.labels = labels; // 更新 X 轴的时间序列 (数据点计数)
        chart.data.datasets[0].data = timeSeriesA; // 更新 A 的占用率数据
        chart.data.datasets[1].data = timeSeriesB; // 更新 B 的占用率数据
        chart.update(); // 刷新图表
    }
}

// 监听 "dataReady" 事件
window.addEventListener("dataReady", (event) => {
    const receivedData = event.detail; // Get the data sent with the event

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

    // 更新折线图
    updateChartData(receivedData);
});

// 初始化折线图
const ctx = document.getElementById('line-chart').getContext('2d');
chart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [], // 数据点标签，初始为空
        datasets: [
            {
                label: 'Road A Occupancy',
                data: [], // 初始为空
                borderColor: 'rgb(99, 115, 255)',
                backgroundColor: 'rgba(99, 115, 255, 0.69)',
                borderWidth: 2,
                fill: true
            },
            {
                label: 'Road B Occupancy',
                data: [], // 初始为空
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
                    text: 'Data Points (30 seconds each)' // 修改为数据点单位并说明
                }
            },
            y: {
                title: {
                    display: true,
                    text: 'Occupancy Rate (%)'
                },
                suggestedMin: 0,
                suggestedMax: 100 // 假设占用率范围是 0% 到 100%
            }
        }
    }
});