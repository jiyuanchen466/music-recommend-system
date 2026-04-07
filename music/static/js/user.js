// 1. 获取对应的 div 元素
const avatarDiv = document.querySelector('.avatar');

avatarDiv.onclick = function() {
    // 2. 动态创建一个隐藏的 input 文件选择器
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*'; // 限制只能选择图片

    // 3. 监听文件选中事件
    fileInput.onchange = function(e) {
        const file = e.target.files[0]; // 获取选中的第一个文件
        if (file) {
            // 4. (可选) 实现即时预览效果
            const reader = new FileReader();
            reader.onload = function(event) {
                // 找到 div 内部的 img 标签并替换 src
                const img = avatarDiv.querySelector('img');
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);

            // 5. 这里可以执行上传逻辑，例如调用 uploadFile(file)
            console.log("已选择图片:", file.name);
        }
    };

    // 6. 模拟点击，弹出系统选择框
    fileInput.click();
};

function hoverIcon(el, enterClass, leaveClass) {
    const icon = el.querySelector('i');

    el.addEventListener('mouseenter', () => {
        icon.className = `iconfont8 ${enterClass}`;
    });

    el.addEventListener('mouseleave', () => {
        icon.className = `iconfont8 ${leaveClass}`;
    });
}

hoverIcon(document.querySelector('.weibo'), 'icon-weibo1', 'icon-weibo');
hoverIcon(document.querySelector('.weixin'), 'icon-weixin1', 'icon-weixin');
hoverIcon(document.querySelector('.qq'), 'icon-QQ1', 'icon-QQ');
const weibo = document.querySelector('.weibo');
const weixin = document.querySelector('.weixin');
const qq = document.querySelector('.qq');

const weiboBox = document.querySelector('.weibo-qrcode-box');
const weixinBox = document.querySelector('.weixin-qrcode-box');
const qqBox = document.querySelector('.qq-qrcode-box');

function hoverBox(trigger, box) {
    trigger.addEventListener('mouseenter', () => {
        box.style.display = 'block';
    });
    trigger.addEventListener('mouseleave', () => {
        box.style.display = 'none';
    });
}

hoverBox(weibo, weiboBox);
hoverBox(weixin, weixinBox);
hoverBox(qq, qqBox);
document.addEventListener('DOMContentLoaded', function() {
    initBirthdaySelector();
    initCitySelector();
    initEventListeners();
    checkSaveButton();
});

function initBirthdaySelector() {
    const yearSelect = document.getElementById('birth-year');
    const monthSelect = document.getElementById('birth-month');
    const daySelect = document.getElementById('birth-day');

    // 获取当前日期
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();

    yearSelect.innerHTML = '<option value="">--</option>';
    for (let y = 1900; y <= currentYear; y++) {
        const option = document.createElement('option');
        option.value = y;
        option.textContent = y;
        yearSelect.appendChild(option);
    }

    monthSelect.innerHTML = '<option value="">--</option>';
    for (let m = 1; m <= 12; m++) {
        const option = document.createElement('option');
        option.value = m;
        option.textContent = m;
        monthSelect.appendChild(option);
    }

    daySelect.innerHTML = '<option value="">--</option>';
    for (let d = 1; d <= 31; d++) {
        const option = document.createElement('option');
        option.value = d;
        option.textContent = d;
        daySelect.appendChild(option);
    }

    if (currentUser.birthday) {
        const parts = currentUser.birthday.split('-');
        if (parts.length === 3) {
            yearSelect.value = parts[0];
            monthSelect.value = parseInt(parts[1]);
            updateDays(yearSelect.value, monthSelect.value, parts[2]);
        }
    }

    yearSelect.addEventListener('change', () => updateDays(yearSelect.value, monthSelect.value));
    monthSelect.addEventListener('change', () => updateDays(yearSelect.value, monthSelect.value));
}

function updateDays(year, month, selectedDay) {
    const daySelect = document.getElementById('birth-day');
    const currentValue = daySelect.value;

    daySelect.innerHTML = '<option value="">--</option>';

    if (!year || !month) return;

    const daysInMonth = new Date(year, month, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
        const option = document.createElement('option');
        option.value = d;
        option.textContent = d;
        daySelect.appendChild(option);
    }

    if (selectedDay) {
        daySelect.value = selectedDay;
    } else if (currentValue && currentValue <= daysInMonth) {
        daySelect.value = currentValue;
    }

    checkSaveButton();
}

function initCitySelector() {
    const provinceSelect = document.getElementById('region-province');
    const citySelect = document.getElementById('region-city');

    // 如果用户有地区信息（省份 + 城市格式）
    if (currentUser.region) {
        const parts = currentUser.region.split(' ');
        const province = parts[0];
        const city = parts[1] || '';

        console.log('初始化地区 - 省份:', province, '城市:', city);

        if (province) {
            loadCities(province, city);
            provinceSelect.value = province;
        }
    }

    provinceSelect.addEventListener('change', function() {
        loadCities(this.value, '');
        checkSaveButton();
    });
}

function loadCities(province, selectedCity = '') {
    const citySelect = document.getElementById('region-city');
    citySelect.innerHTML = '<option value="">请选择城市</option>';

    const cities = china_divisions[province];
    if (cities && Array.isArray(cities)) {
        cities.forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            // 如果有预设的城市，设置为选中
            if (city === selectedCity) {
                option.selected = true;
            }
            citySelect.appendChild(option);
        });
    }
}

function initEventListeners() {
    console.log('=== initEventListeners 执行 ===');

    const avatarDiv = document.querySelector('.avatar');
    if (avatarDiv) {
        avatarDiv.onclick = uploadAvatarHandler;
        console.log('头像点击事件已绑定');
    }

    const inputs = ['gender-male', 'gender-female', 'gender-secret',
        'birth-year', 'birth-month', 'birth-day',
        'region-province', 'region-city', 'introduce'
    ];

    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', checkSaveButton);
            el.addEventListener('input', checkSaveButton);
            console.log(`已为 ${id} 绑定事件`);
        }
    });

    const saveBtn = document.getElementById('save');
    if (saveBtn) {
        saveBtn.onclick = saveProfile;
        console.log('保存按钮事件已绑定');
    }

    const cancelBtn = document.getElementById('cancel-account');
    if (cancelBtn) {
        cancelBtn.onclick = deleteAccount;
        console.log('注销账户事件已绑定');
    }

    const logoutBtn = document.getElementById('logout');
    if (logoutBtn) {
        logoutBtn.onclick = logout;
        console.log('退出登录事件已绑定');
    }

    console.log('=== initEventListeners 完成 ===');
}

function checkSaveButton() {
    const nickname = document.getElementById('nickname').value;
    const genderMale = document.getElementById('gender-male').checked;
    const genderFemale = document.getElementById('gender-female').checked;
    const genderSecret = document.getElementById('gender-secret').checked;

    // 性别处理：保密时设置为空字符串
    let gender = '';
    if (genderMale) {
        gender = '0';
    } else if (genderFemale) {
        gender = '1';
    } else if (genderSecret) {
        gender = ''; // 保密时为空字符串
    }

    const birthYear = document.getElementById('birth-year').value;
    const birthMonth = document.getElementById('birth-month').value;
    const birthDay = document.getElementById('birth-day').value;
    const regionProvince = document.getElementById('region-province').value;
    const regionCity = document.getElementById('region-city').value;
    const region = regionProvince && regionCity ? `${regionProvince} ${regionCity}` : regionProvince;
    const introduce = document.getElementById('introduce').value;

    // 构建当前生日字符串
    const birthday = birthYear && birthMonth && birthDay ?
        `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}` : '';

    // 比较是否有变化
    const hasChanges = (
        nickname !== currentUser.nickname ||
        gender !== currentUser.gender ||
        birthday !== currentUser.birthday ||
        region !== currentUser.region ||
        introduce !== currentUser.introduce
    );

    const saveBtn = document.getElementById('save');
    saveBtn.disabled = !hasChanges;
    saveBtn.style.backgroundColor = hasChanges ? 'yellowgreen' : 'rgba(128, 128, 128, 0.4)';
    saveBtn.style.color = hasChanges ? '#fff' : '#555';
    saveBtn.style.cursor = hasChanges ? 'pointer' : 'not-allowed';

    console.log('保存按钮状态:', {
        hasChanges: hasChanges,
        disabled: saveBtn.disabled,
        gender: gender,
        genderMale: genderMale,
        genderFemale: genderFemale,
        genderSecret: genderSecret,
        birthday: birthday,
        currentUserBirthday: currentUser.birthday,
        birthdayMatch: birthday === currentUser.birthday
    });
}

function saveNickname() {
    saveProfile();
}

// 保存用户资料
// 保存用户资料 - 确保是全局函数
window.saveProfile = function saveProfile() {
    console.log('\n=== saveProfile 被调用 ===');

    const nickname = document.getElementById('nickname').value;
    console.log('昵称值:', nickname);

    let gender = '';
    if (document.getElementById('gender-male').checked) {
        gender = '0';
    } else if (document.getElementById('gender-female').checked) {
        gender = '1';
    }
    // 保密时 gender 保持为空字符串 ''

    const birthYear = document.getElementById('birth-year').value;
    const birthMonth = document.getElementById('birth-month').value;
    const birthDay = document.getElementById('birth-day').value;

    // 如果生日未完全选择，设置为 null
    const birthday = (birthYear && birthMonth && birthDay) ?
        `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}` : null;

    // 获取省份和城市并组合
    const regionProvince = document.getElementById('region-province').value;
    const regionCity = document.getElementById('region-city').value;
    const region = regionProvince && regionCity ? `${regionProvince} ${regionCity}` : regionProvince;

    const introduce = document.getElementById('introduce').value;

    console.log('准备保存数据:', {
        nickname: nickname,
        gender: gender,
        birthday: birthday,
        region: region,
        introduce: introduce
    });

    fetch('/save_profile/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                nickname: nickname,
                gender: gender,
                birthday: birthday, // 可能是 null
                region: region,
                introduce: introduce
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('保存响应:', data);
            if (data.success) {
                alert('保存成功！');

                // 更新 currentUser 对象为最新值
                currentUser.nickname = nickname;
                currentUser.gender = gender;
                currentUser.birthday = birthday;
                currentUser.region = region;
                currentUser.introduce = introduce;

                // 重新检查保存按钮状态（应该变为不可用）
                checkSaveButton();
            } else {
                alert('保存失败：' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('网络错误');
        });
}

function uploadAvatarHandler() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';

    fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('图片大小不能超过 5MB');
                return;
            }

            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    // 创建 canvas 压缩图片
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // 设置最大尺寸
                    const maxWidth = 400;
                    const maxHeight = 400;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxWidth) {
                            height = height * (maxWidth / width);
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = width * (maxHeight / height);
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);

                    // 压缩为 JPEG 格式，质量 0.8
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);

                    fetch('/upload_avatar/', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRFToken': getCookie('csrftoken')
                            },
                            body: JSON.stringify({
                                avatar_base64: compressedBase64
                            })
                        })
                        .then(response => response.json())
                        .then(data => {
                            console.log('上传响应:', data);
                            if (data.success) {
                                // 使用系统永久链接
                                const avatarUrl = data.avatar_url + '?t=' + new Date().getTime();

                                // 更新页面上的头像
                                const avatarImg = document.querySelector('.avatar img');
                                if (avatarImg) {
                                    avatarImg.src = avatarUrl;
                                    console.log('头像已更新:', avatarUrl);
                                }

                                // 同时更新所有可能的头像元素
                                const allAvatars = document.querySelectorAll('.user-avatar');
                                allAvatars.forEach(avatar => {
                                    avatar.src = avatarUrl;
                                });

                                // 更新全局变量
                                currentUser.avatar = avatarUrl;

                                alert('头像上传成功！');
                            } else {
                                alert('上传失败：' + data.message);
                            }
                        })
                        .catch(error => {
                            console.error('Error:', error);
                            alert('网络错误');
                        });
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    };

    fileInput.click();
}
// 在上传头像成功后的回调函数中添加强制刷新
function uploadAvatarSuccess(response) {
    if (response.success) {
        // 更新页面上的头像显示
        const avatarElement = document.getElementById('user-avatar');
        if (avatarElement) {
            // 添加时间戳参数，强制浏览器重新加载图片
            const timestamp = new Date().getTime();
            const imageUrl = response.avatar_url + '?t=' + timestamp;

            // 更新图片源
            avatarElement.src = imageUrl;

            // 如果有多个头像元素，也一并更新
            const allAvatars = document.querySelectorAll('.user-avatar');
            allAvatars.forEach(avatar => {
                avatar.src = imageUrl;
            });

            // 更新全局变量
            currentUser.avatar = imageUrl;

            // 显示成功提示
            showNotification('头像上传成功！');
        }
    } else {
        showErrorNotification('上传失败：' + response.message);
    }
}

// 在上传头像的函数中调用
function uploadAvatar() {
    const formData = new FormData();
    formData.append('avatar_base64', avatarBase64);

    fetch('/upload_avatar/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ avatar_base64: avatarBase64 })
        })
        .then(response => response.json())
        .then(uploadAvatarSuccess)
        .catch(error => {
            console.error('Error:', error);
            showErrorNotification('上传失败，请重试');
        });
}

function showPassword() {
    const pwdInput = document.getElementById('password');
    pwdInput.type = 'text';
    setTimeout(() => {
        pwdInput.type = 'password';
    }, 3000);
}

function savePassword() {
    const password = document.getElementById('password').value;

    if (!password || password === '***') {
        alert('请输入新密码');
        return;
    }

    fetch('/update_password/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('密码更新成功！');
                document.getElementById('password').type = 'password';
            } else {
                alert('更新失败：' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('网络错误');
        });
}

function deleteAccount() {
    if (confirm('确定要注销账户吗？此操作不可恢复，将删除所有相关数据！')) {
        if (confirm('再次确认：您确定要永久删除账户吗？')) {
            fetch('/delete_account/', {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': getCookie('csrftoken')
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('账户已注销，正在跳转...');
                        window.location.href = '/login/';
                    } else {
                        alert('注销失败：' + data.message);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('网络错误');
                });
        }
    }
}

function logout() {
    if (confirm('确定要退出登录吗？')) {
        fetch('/logout_user/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCookie('csrftoken')
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.href = '/login/';
                } else {
                    alert('退出失败：' + data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('网络错误');
            });
    }
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.startsWith(name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}