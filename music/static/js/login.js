const pwinp = document.getElementById('password');
const yanjing = document.getElementById('yanjing');
if (yanjing) {
    yanjing.addEventListener('click', function() {
        if (pwinp.type === 'password') {
            pwinp.type = 'text';
            yanjing.className = 'iconfont icon-yanjing';
        } else {
            pwinp.type = 'password';
            yanjing.className = 'iconfont icon-biyanjing';
        }
    });
}
const uminp = document.getElementById('username');

uminp.onfocus = function() {
    this.dataset.placeholderBak = this.placeholder;
    this.placeholder = '';
};
pwinp.onfocus = function() {
    this.dataset.placeholderBak = this.placeholder;
    this.placeholder = '';
};

uminp.onblur = function() {
    this.placeholder = this.dataset.placeholderBak;
};
pwinp.onblur = function() {
    this.placeholder = this.dataset.placeholderBak;
};
const yzbtn = document.querySelector('.yanzheng');
const loginbtn = document.querySelector('.login-btn');

uminp.addEventListener('input', function() {
    toggleButtons();
    if (isVerified) resetVerifyState();
});

pwinp.addEventListener('input', function() {
    toggleButtons();
    if (isVerified) resetVerifyState();
});

toggleButtons();

function toggleButtons() {
    const usernameValue = uminp.value.trim();
    const passwordValue = pwinp.value.trim();

    if (usernameValue !== '' && passwordValue !== '') {
        yzbtn.style.display = 'block';
    } else {
        yzbtn.style.display = 'none';
    }
}

const verifyWindow = document.querySelector('.verify-window');
const verifyQuit = document.getElementById('verify-quit');
if (yzbtn) {
    yzbtn.addEventListener('click', function() {
        verifyWindow.style.display = 'block';
    });
}
if (verifyQuit) {
    verifyQuit.addEventListener('click', function() {
        verifyWindow.style.display = 'none';
    });
}

function getUniqueRandomNumber(count, min, max) {
    const uniqueNumbers = new Set();
    if (max - min + 1 < count) return [];

    while (uniqueNumbers.size < count) {
        const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
        uniqueNumbers.add(randomNum);
    }
    return Array.from(uniqueNumbers);
}

let verifyText = '晨曦薄雾缓缓铺展山峦轮廓幽林静穆承载岁月痕迹微风穿行石径水岸光影层叠流转天际远云舒卷映照湖面粼粼波纹回应心绪古钟回荡唤醒记忆时序悄然更替书页翻动墨香弥散思想游走字里行间星辰隐现夜幕深处寂静包容万象呼吸情感沉淀于无声瞬间意识仿佛漂泊舟楫此刻世界缓慢展开自然与灵魂彼此凝望道路延伸通向未知方向勇气悄然生根历史纹理镌刻文明温度生命光辉在暗处闪耀风雨洗礼塑造坚韧品格时间见证存在价值终章未至行走仍在继续';
const verifyTextEle = document.getElementById('verify-text');
const sxbtn = document.getElementById('verify-again');
const container = document.getElementById('verify-img');
const verifybtn = document.querySelector('.verify-btn');
const verifyError = document.querySelector('.verify-error');
const verifySuccess = document.querySelector('.verify-success');
const djyzbtn = document.getElementById('dianjiyanzheng');
let clickPoints = [];
let isVerified = false;
let targetWordsInfo = [];

function resetVerifyState() {
    isVerified = false;

    if (yzbtn) {
        yzbtn.innerHTML = '<i class="iconfont icon-dianjiyanzheng"></i>点击验证';
        yzbtn.style.pointerEvents = 'auto';
        yzbtn.style.cursor = 'pointer';
        yzbtn.style.backgroundColor = '';
        yzbtn.style.color = '';
    }
    if (djyzbtn) {
        djyzbtn.style.color = '';
    }

    if (loginbtn) {
        loginbtn.disabled = true;
        loginbtn.style.opacity = '0.5';
        loginbtn.style.cursor = 'not-allowed';
        loginbtn.style.pointerEvents = 'none';
    }

    clickPoints = [];
    updateLoginButtonStatus();
}

function updateLoginButtonStatus() {
    if (!verifybtn) return;
    if (clickPoints.length >= 1) {
        verifybtn.style.pointerEvents = 'auto';
        verifybtn.style.opacity = '1';
        verifybtn.style.cursor = 'pointer';
        verifybtn.disabled = false;
        verifybtn.style.backgroundColor = 'red';
    } else {
        verifybtn.style.pointerEvents = 'none';
        verifybtn.style.opacity = '0.5';
        verifybtn.style.cursor = 'not-allowed';
        verifybtn.disabled = true;
        verifybtn.style.backgroundColor = 'pink';
    }
}

function refreshVerify() {
    if (!container) return;
    container.innerHTML = '';
    clickPoints = [];
    targetWordsInfo = [];
    updateLoginButtonStatus();
    $.get('/get_random_image/', function(data) {
        const img_url = data.img_url;
        $('#verify-img').css({
            'background-image': `url(${img_url})`,
            'background-size': 'cover',
            'background-position': 'center',
            'background-repeat': 'no-repeat'
        });
    });
    const count = Math.floor(Math.random() * 3) + 2;
    const randomNumbers = getUniqueRandomNumber(count, 0, verifyText.length - 1);
    const verifyTextArr = randomNumbers.map(index => verifyText[index]);
    if (verifyTextEle) {
        verifyTextEle.innerHTML = verifyTextArr.join('');
    }
    verifyTextArr.forEach(word => {
        const info = addRandomText(word, targetWordsInfo);
        if (info) targetWordsInfo.push({...info, text: word });
    });
}

function isHit(x, y, wordInfo) {
    const buffer = 10;
    return (
        x >= wordInfo.x - buffer &&
        x <= wordInfo.x + wordInfo.w + buffer &&
        y >= wordInfo.y - buffer &&
        y <= wordInfo.y + wordInfo.h + buffer
    );
}

function addRandomText(text, placedElements) {
    const span = document.createElement('span');
    span.innerText = text;
    span.className = 'verify-word-item';
    span.style.position = 'absolute';
    span.style.whiteSpace = 'nowrap';
    span.style.display = 'inline-block';
    span.style.fontFamily = 'font5';
    span.style.zIndex = '10';
    span.style.fontWeight = 'bold';
    span.style.userSelect = 'none';
    span.style.pointerEvents = 'none';
    const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000', '#000080', '#808000', '#800000', '#008080', '#000000'];
    span.style.color = colors[Math.floor(Math.random() * colors.length)];
    const fontsize = Math.floor(Math.random() * 30) + 35;
    span.style.fontSize = fontsize + 'px';
    const ramdomDeg = Math.floor(Math.random() * 80) - 40;
    span.style.transform = `rotate(${ramdomDeg}deg)`;
    container.appendChild(span);
    const cw = container.clientWidth || 390;
    const ch = container.clientHeight || 380;
    const sw = span.offsetWidth;
    const sh = span.offsetHeight;
    let randomX, randomY, attempts = 0;
    let isOverlapping = true;
    const padding = 20;
    while (isOverlapping && attempts < 100) {
        randomX = Math.floor(Math.random() * (cw - sw - padding * 2)) + padding;
        randomY = Math.floor(Math.random() * (ch - sh - padding * 2)) + padding;
        isOverlapping = false;
        for (let i = 0; i < placedElements.length; i++) {
            const other = placedElements[i];
            const buffer = 20;
            if (!(randomX + sw + buffer < other.x || randomX > other.x + other.w + buffer ||
                    randomY + sh + buffer < other.y || randomY > other.y + other.h + buffer)) {
                isOverlapping = true;
                break;
            }
        }
        attempts++;
    }
    span.style.left = randomX + 'px';
    span.style.top = randomY + 'px';
    return { x: randomX, y: randomY, w: sw, h: sh };
}

if (verifybtn) {
    verifybtn.addEventListener('click', function() {
        let isAllCorrect = true;
        if (clickPoints.length !== targetWordsInfo.length) {
            isAllCorrect = false;
        } else {
            for (let i = 0; i < targetWordsInfo.length; i++) {
                if (!isHit(clickPoints[i].x, clickPoints[i].y, targetWordsInfo[i])) {
                    isAllCorrect = false;
                    break;
                }
            }
        }
        if (isAllCorrect) {
            verifyError.style.display = 'none';
            verifySuccess.style.display = 'block';

            setTimeout(function() {
                verifySuccess.style.display = 'none';
                verifyWindow.style.display = 'none';

                isVerified = true;

                if (loginbtn) {
                    loginbtn.disabled = false;
                    loginbtn.style.opacity = '1';
                    loginbtn.style.cursor = 'pointer';
                    loginbtn.style.pointerEvents = 'auto';
                    loginbtn.style.backgroundColor = 'purple';
                }

                if (yzbtn) {
                    yzbtn.innerHTML = '<i class="iconfont icon-yanzheng"></i>已验证';
                    yzbtn.style.pointerEvents = 'none';
                    yzbtn.style.cursor = 'not-allowed';
                    yzbtn.style.backgroundColor = 'green';
                    yzbtn.style.color = '#fff';
                }
                if (djyzbtn) {
                    djyzbtn.style.color = '#fff';
                }
            }, 500);
        } else {
            verifyError.style.display = 'block';
            verifySuccess.style.display = 'none';
            setTimeout(function() {
                verifyError.style.display = 'none';
                refreshVerify();
            }, 500);
        }
    });
}

function showVerifyResult(isSuccess) {
    if (isSuccess) {
        verifyError.style.display = 'none';
        verifySuccess.style.display = 'block';
    } else {
        verifyError.style.display = 'block';
        verifySuccess.style.display = 'none';
        setTimeout(function() {
            refreshVerify();
        }, 500);
    }
}

if (container) {
    container.addEventListener('click', function(e) {
        if (e.target.classList.contains('verify-circle')) {
            const index = parseInt(e.target.getAttribute('data-index'));
            const allCircles = container.querySelectorAll('.verify-circle');
            allCircles.forEach(circle => {
                if (parseInt(circle.getAttribute('data-index')) >= index) circle.remove();
            });
            clickPoints = clickPoints.slice(0, index - 1);
            updateLoginButtonStatus();
            return;
        }
        if (clickPoints.length >= targetWordsInfo.length) return;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        clickPoints.push({ x, y });
        const currentIndex = clickPoints.length;
        const circle = document.createElement('div');
        circle.className = 'verify-circle';
        circle.innerText = currentIndex;
        circle.setAttribute('data-index', currentIndex);
        Object.assign(circle.style, {
            position: 'absolute',
            left: (x - 15) + 'px',
            top: (y - 15) + 'px',
            width: '30px',
            height: '30px',
            backgroundColor: 'blue',
            border: '2px solid #fff',
            color: '#fff',
            borderRadius: '50%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '999999',
            cursor: 'pointer',
            fontSize: '16px',
            userSelect: 'none'
        });
        container.appendChild(circle);
        updateLoginButtonStatus();
    });
}

$(document).ready(function() {
    updateLoginButtonStatus();
    refreshVerify();
    if (yzbtn) yzbtn.addEventListener('click', refreshVerify);
    if (sxbtn) sxbtn.addEventListener('click', refreshVerify);
});

// ==================== 注册页面相关功能 ====================
const yjbtn1 = document.getElementById('yanjing1');
const pwinp1 = document.getElementById('password1');
if (yjbtn1 && pwinp1) {
    yjbtn1.addEventListener('click', function() {
        if (pwinp1.type === 'password') {
            pwinp1.type = 'text';
            yjbtn1.className = 'iconfont icon-yanjing';
        } else {
            pwinp1.type = 'password';
            yjbtn1.className = 'iconfont icon-biyanjing';
        }
    });
}

const yjbtn2 = document.getElementById('yanjing2');
const pwinp2 = document.getElementById('password2');
if (yjbtn2 && pwinp2) {
    yjbtn2.addEventListener('click', function() {
        if (pwinp2.type === 'password') {
            pwinp2.type = 'text';
            yjbtn2.className = 'iconfont icon-yanjing';
        } else {
            pwinp2.type = 'password';
            yjbtn2.className = 'iconfont icon-biyanjing';
        }
    });
}

const dui1 = document.getElementById('dui1');
const cuowu1 = document.getElementById('cuowu1');

function validatePasswords() {
    if (pwinp1 && pwinp1.value !== '') {
        if (dui1) dui1.style.display = 'inline';
    } else {
        if (dui1) dui1.style.display = 'none';
    }

    if (pwinp2 && pwinp2.value !== '') {
        if (pwinp2.value === pwinp1.value) {
            if (cuowu1) {
                cuowu1.style.display = 'inline';
                cuowu1.className = 'iconfont icon-zhengqueshixin';
            }
        } else {
            if (cuowu1) {
                cuowu1.style.display = 'inline';
                cuowu1.className = 'iconfont icon-iconfonticonfontwarn';
            }
        }
    } else {
        if (cuowu1) cuowu1.style.display = 'none';
    }
}

if (pwinp1) pwinp1.addEventListener('input', validatePasswords);
if (pwinp2) pwinp2.addEventListener('input', validatePasswords);

validatePasswords();

const regbtn = document.getElementById('register-btn');
const lobtn = document.getElementById('login-btn');
const loc = document.querySelector('.login-container');
const regc = document.querySelector('.register-container');

if (regbtn) {
    regbtn.addEventListener('click', function() {
        if (regc) regc.style.display = 'block';
        if (loc) loc.style.display = 'none';
    });
}

if (lobtn) {
    lobtn.addEventListener('click', function() {
        if (regc) regc.style.display = 'none';
        if (loc) loc.style.display = 'block';
    });
}

const ecbtn = document.getElementById('email-code-btn');
const uninp1 = document.getElementById('username1');
const eminp = document.getElementById('email');
const ecinp = document.getElementById('email_code');
let countdownInterval = null;
let isCountdownActive = false;
let emailTimer = null;
let emailCountdown = 60;
let isEmailSent = false;

if (eminp) {
    eminp.addEventListener('input', function() {
        if (eminp.value.trim() !== '') {
            if (!isCountdownActive && ecbtn) {
                ecbtn.style.backgroundColor = '#00ffff';
                ecbtn.style.cursor = 'pointer';
                ecbtn.style.pointerEvents = 'auto';
                ecbtn.style.color = '#000';
                ecbtn.disabled = false;
                if (ecbtn.textContent === '重新获取') {
                    ecbtn.textContent = '获取验证码';
                }
            }
        } else {
            if (ecbtn) {
                ecbtn.style.backgroundColor = '#666';
                ecbtn.style.cursor = 'not-allowed';
                ecbtn.style.pointerEvents = 'none';
                ecbtn.style.color = '#fff';
                ecbtn.disabled = true;
            }
        }
    });

    if (eminp.value.trim() !== '') {
        if (ecbtn) {
            ecbtn.style.backgroundColor = '#00ffff';
            ecbtn.style.cursor = 'pointer';
            ecbtn.style.pointerEvents = 'auto';
            ecbtn.style.color = '#000';
            ecbtn.disabled = false;
        }
    } else {
        if (ecbtn) {
            ecbtn.style.backgroundColor = '#666';
            ecbtn.style.cursor = 'not-allowed';
            ecbtn.style.pointerEvents = 'none';
            ecbtn.style.color = '#fff';
            ecbtn.disabled = true;
        }
    }
}

if (ecbtn) {
    ecbtn.addEventListener('click', function() {
        if (!isCountdownActive && eminp && eminp.value.trim() !== '') {
            const emailPrefix = eminp.value.trim();
            const emailSuffix = document.querySelector('.email-end');
            const emailSuffixValue = emailSuffix ? emailSuffix.value : '';

            if (!emailPrefix || !emailSuffixValue) {
                showError('请输入完整邮箱地址');
                return;
            }

            const fullEmail = emailPrefix + emailSuffixValue;
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (!emailRegex.test(fullEmail)) {
                showError('邮箱格式不正确');
                return;
            }

            $.ajax({
                url: '/send_email_code/',
                type: 'POST',
                data: {
                    'email_prefix': emailPrefix,
                    'email_suffix': emailSuffixValue,
                    'csrfmiddlewaretoken': getCookie('csrftoken')
                },
                success: function(response) {
                    if (response.success) {
                        showSuccess('验证码已发送，请查收邮箱');
                        isEmailSent = true;
                        startEmailCountdown();
                    } else {
                        showError(response.message || '验证码发送失败，请检查邮箱信息');
                    }
                },
                error: function(xhr, status, error) {
                    showError('网络错误，请稍后重试');
                }
            });
        }
    });
}

function startEmailCountdown() {
    if (emailTimer) {
        clearInterval(emailTimer);
    }

    isCountdownActive = true;
    emailCountdown = 60;

    if (ecbtn) {
        ecbtn.style.backgroundColor = '#666';
        ecbtn.style.cursor = 'not-allowed';
        ecbtn.style.pointerEvents = 'none';
        ecbtn.style.color = '#fff';
        ecbtn.disabled = true;
        ecbtn.textContent = `${emailCountdown}s 后重发`;
    }

    emailTimer = setInterval(function() {
        emailCountdown--;
        if (ecbtn) {
            ecbtn.textContent = `${emailCountdown}s 后重发`;
        }

        if (emailCountdown <= 0) {
            clearInterval(emailTimer);
            emailTimer = null;
            isCountdownActive = false;
            isEmailSent = false;
            emailCountdown = 60;

            if (ecbtn) {
                ecbtn.textContent = '获取验证码';
                if (eminp && eminp.value.trim() !== '') {
                    ecbtn.style.backgroundColor = '#00ffff';
                    ecbtn.style.cursor = 'pointer';
                    ecbtn.style.pointerEvents = 'auto';
                    ecbtn.style.color = '#000';
                    ecbtn.disabled = false;
                }
            }
        }
    }, 1000);
}

const rgbtn1 = document.getElementById('register-btn1');

function checkRegisterFields() {
    if (!rgbtn1) return;

    var un = uninp1 && uninp1.value ? uninp1.value.trim() : '';
    var pw1 = pwinp1 && pwinp1.value ? pwinp1.value.trim() : '';
    var pw2 = pwinp2 && pwinp2.value ? pwinp2.value.trim() : '';
    var em = eminp && eminp.value ? eminp.value.trim() : '';
    var ec = ecinp && ecinp.value ? ecinp.value.trim() : '';

    var isAllFilled = un && pw1 && pw2 && em && ec;

    if (isAllFilled) {
        rgbtn1.disabled = false;
        rgbtn1.style.cursor = 'pointer';
        rgbtn1.style.opacity = '1';
    } else {
        rgbtn1.disabled = true;
        rgbtn1.style.cursor = 'not-allowed';
        rgbtn1.style.opacity = '0.5';
    }
}

if (uninp1) uninp1.addEventListener('input', checkRegisterFields);
if (pwinp1) pwinp1.addEventListener('input', checkRegisterFields);
if (pwinp2) pwinp2.addEventListener('input', checkRegisterFields);
if (eminp) eminp.addEventListener('input', checkRegisterFields);
if (ecinp) ecinp.addEventListener('input', checkRegisterFields);

checkRegisterFields();

const registerForm = document.querySelector('.register-form');
if (registerForm) {
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const username = uninp1 ? uninp1.value.trim() : '';
        const password = pwinp1 ? pwinp1.value.trim() : '';
        const confirmPassword = pwinp2 ? pwinp2.value.trim() : '';
        const emailPrefix = eminp ? eminp.value.trim() : '';
        const emailSuffixElem = document.querySelector('.email-end');
        const emailSuffixValue = emailSuffixElem ? emailSuffixElem.value : '';
        const emailCode = ecinp ? ecinp.value.trim() : '';
        const fullEmail = emailPrefix + emailSuffixValue;

        if (!username) {
            showError('请输入账号');
            return;
        }

        if (!password) {
            showError('请输入密码');
            return;
        }

        if (password !== confirmPassword) {
            showError('两次输入的密码不一致');
            return;
        }

        if (!emailPrefix) {
            showError('请输入邮箱名');
            return;
        }

        if (!emailCode) {
            showError('请输入验证码');
            return;
        }

        $.ajax({
            url: '/check_username_email/',
            type: 'POST',
            data: {
                'username': username,
                'email_prefix': emailPrefix,
                'email_suffix': emailSuffixValue,
                'csrfmiddlewaretoken': getCookie('csrftoken')
            },
            success: function(response) {
                if (!response.success) {
                    showError(response.message);
                } else {
                    $.ajax({
                        url: '/verify_email_code/',
                        type: 'POST',
                        data: {
                            'email': fullEmail,
                            'code': emailCode,
                            'csrfmiddlewaretoken': getCookie('csrftoken')
                        },
                        success: function(verifyResponse) {
                            if (!verifyResponse.success) {
                                showError(verifyResponse.message);
                            } else {
                                $.ajax({
                                    url: '/register_user/',
                                    type: 'POST',
                                    data: {
                                        'username': username,
                                        'password': password,
                                        'email_prefix': emailPrefix,
                                        'email_suffix': emailSuffixValue,
                                        'email_code': emailCode,
                                        'csrfmiddlewaretoken': getCookie('csrftoken')
                                    },
                                    success: function(registerResponse) {
                                        if (registerResponse.success) {
                                            showSuccess('注册成功！即将跳转到登录页面...');
                                            setTimeout(function() {
                                                window.location.href = '/login/';
                                            }, 2000);
                                        } else {
                                            showError(registerResponse.message);
                                        }
                                    },
                                    error: function(xhr, status, error) {
                                        showError('网络错误，请稍后重试');
                                    }
                                });
                            }
                        },
                        error: function(xhr, status, error) {
                            showError('网络错误，请稍后重试');
                        }
                    });
                }
            },
            error: function(xhr, status, error) {
                showError('网络错误，请稍后重试');
            }
        });
    });
}

function showError(message) {
    const errorText = document.querySelector('.error-text');
    const errorMessage = document.querySelector('.message-error');

    if (errorText && errorMessage) {
        errorText.textContent = message;
        errorMessage.style.display = 'block';

        setTimeout(function() {
            errorMessage.style.display = 'none';
        }, 3000);
    }
}

function showSuccess(message) {
    const successText = document.querySelector('.success-text');
    const successMessage = document.querySelector('.message-success');

    if (successText && successMessage) {
        successText.textContent = message;
        successMessage.style.display = 'block';

        setTimeout(function() {
            successMessage.style.display = 'none';
        }, 3000);
    }
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// ... existing code ...

// ==================== 找回密码功能 ====================
const feinput = document.getElementById('find-email');
const febtn = document.getElementById('find-email-send-btn');
let forgetTimer = null;
let forgetCountdown = 60;

// 删除旧的纯倒计时代码（第 741-761 行）
// 这段代码被下面的完整实现替代

const fpwinput = document.getElementById('find-password');
const yjbtn3 = document.getElementById('yanjing3');
if (yjbtn3 && fpwinput) {
    yjbtn3.addEventListener('click', function() {
        if (fpwinput.type === 'password') {
            fpwinput.type = 'text';
            yjbtn3.className = 'iconfont icon-yanjing';
        } else {
            fpwinput.type = 'password';
            yjbtn3.className = 'iconfont icon-biyanjing';
        }
    });
}

const span_list = document.querySelectorAll('.find-process span');
const fninput = document.getElementById('find-username');
const fbtn1 = document.querySelector('.find-step1-btn');
const fecinput = document.getElementById('find-email-code');
const fbtn2 = document.querySelector('.find-step2-btn');
const fbtn3 = document.querySelector('.find-step3-btn');
const fs1 = document.querySelector('.find-step1');
const fs2 = document.querySelector('.find-step2');
const fs3 = document.querySelector('.find-step3');
const fs4 = document.querySelector('.find-step4');
const ft = document.querySelector('.find-password-time');

function setStep(index) {
    [fs1, fs2, fs3, fs4].forEach(function(el, i) {
        el.style.display = i === index ? 'block' : 'none';
    });
    span_list.forEach(function(span, i) {
        span.classList.toggle('current-step', i === index);
    });
}

function toggleBtn(inputList, btn) {
    var ok = true;
    inputList.forEach(function(el) {
        if (!el || !el.value.trim()) ok = false;
    });
    btn.disabled = !ok;
    btn.style.cursor = ok ? 'pointer' : 'not-allowed';
    btn.style.opacity = ok ? '1' : '0.5';
}

if (fninput) {
    fninput.addEventListener('input', function() {
        toggleBtn([fninput], fbtn1);
    });
}

if (fecinput) {
    fecinput.addEventListener('input', function() {
        toggleBtn([fecinput], fbtn2);
    });
}

if (fpwinput) {
    fpwinput.addEventListener('input', function() {
        toggleBtn([fpwinput], fbtn3);
    });
}

// 删除旧的 fbtn1、fbtn2、fbtn3 点击事件（第 808-838 行）
// 这些事件被下面的完整实现替代

setStep(0);

const fpwbtn = document.querySelector('.forget-password');
const fcw = document.querySelector('.forget-container');
const fbbtn = document.querySelector('.forget-back-btn');

if (fpwbtn) {
    fpwbtn.addEventListener('click', function() {
        resetForgetState();
        const loginContainer = document.querySelector('.login-container');
        const forgetContainer = document.querySelector('.forget-container');
        if (loginContainer) loginContainer.style.display = 'none';
        if (forgetContainer) forgetContainer.style.display = 'block';
    });
}

if (fbbtn) {
    fbbtn.addEventListener('click', function() {
        resetForgetState();
        const forgetContainer = document.querySelector('.forget-container');
        const loginContainer = document.querySelector('.login-container');
        if (forgetContainer) forgetContainer.style.display = 'none';
        if (loginContainer) loginContainer.style.display = 'block';
    });
}

function resetForgetState() {
    if (forgetTimer) {
        clearInterval(forgetTimer);
        forgetTimer = null;
    }
    forgetCountdown = 60;
    if (febtn) {
        febtn.disabled = false;
        febtn.style.cursor = 'pointer';
        febtn.innerText = '获取验证码';
    }
    setStep(0);
}

// ==================== 完整的找回密码功能实现 ====================
let findPasswordUsername = '';
let findPasswordEmail = '';
let findPasswordOldPassword = '';
let userData = null;

// 第一步：检查账号是否存在
if (fbtn1) {
    fbtn1.addEventListener('click', function() {
        const username = fninput ? fninput.value.trim() : '';

        if (!username) {
            showError('请输入账号');
            return;
        }

        $.ajax({
            url: '/check_find_password_username/',
            type: 'POST',
            data: {
                'username': username,
                'csrfmiddlewaretoken': getCookie('csrftoken')
            },
            success: function(response) {
                if (response.success) {
                    // 账号存在，保存用户信息
                    findPasswordUsername = username;
                    userData = response.data;
                    findPasswordOldPassword = userData.password;
                    findPasswordEmail = userData.email;

                    // 自动填充邮箱输入框
                    if (feinput && userData.email) {
                        const email = userData.email;
                        const atIndex = email.indexOf('@');
                        if (atIndex > 2) {
                            const maskedEmail = email.substring(0, 2) + '***' + email.substring(atIndex);
                            feinput.value = maskedEmail;
                            feinput.dataset.realEmail = email;
                        } else {
                            feinput.value = email;
                            feinput.dataset.realEmail = email;
                        }
                    }

                    // 进入第二步
                    setStep(1);
                    showSuccess('账号验证通过');
                } else {
                    showError(response.message || '账号不存在');
                }
            },
            error: function(xhr, status, error) {
                showError('网络错误，请稍后重试');
            }
        });
    });
}

// 第二步：发送邮箱验证码
if (febtn) {
    febtn.addEventListener('click', function() {
        if (febtn.disabled) return;

        const emailInput = feinput ? feinput.value.trim() : '';

        console.log('\n=== 点击获取验证码按钮 ===');
        console.log('邮箱输入框值:', emailInput);
        console.log('数据库邮箱:', findPasswordEmail);

        // 检查邮箱是否为空
        if (!emailInput) {
            showError('请输入邮箱地址');
            return;
        }

        // 使用数据库中存储的真实邮箱（跳过遮罩邮箱验证）
        const realEmail = (feinput && feinput.dataset.realEmail) ? feinput.dataset.realEmail : findPasswordEmail;

        console.log('实际使用的邮箱:', realEmail);

        if (!realEmail) {
            showError('未找到注册邮箱信息，请重新输入账号');
            return;
        }

        // 如果输入的是遮罩邮箱（包含***），直接使用真实邮箱
        let isMaskedEmail = false;
        if (emailInput.includes('***')) {
            isMaskedEmail = true;
            console.log('检测到遮罩邮箱，使用真实邮箱:', realEmail);
        } else {
            // 如果用户手动输入了完整邮箱，验证格式
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (!emailRegex.test(emailInput)) {
                showError('邮箱格式不正确');
                return;
            }

            // 检查输入的邮箱是否与数据库中的邮箱匹配
            if (emailInput !== realEmail) {
                showError('邮箱与账号不匹配');
                return;
            }
        }

        // 禁用按钮防止重复点击
        const originalText = febtn.innerText;
        febtn.disabled = true;
        febtn.style.cursor = 'not-allowed';
        febtn.innerText = '发送中...';

        // 发送验证码到真实邮箱
        $.ajax({
            url: '/send_find_password_email/',
            type: 'POST',
            data: {
                'username': findPasswordUsername,
                'email': realEmail, // 使用数据库中的真实邮箱
                'csrfmiddlewaretoken': getCookie('csrftoken')
            },
            success: function(response) {
                console.log('AJAX 响应:', response);

                if (response.success) {
                    showSuccess('验证码已发送，请查收邮箱');
                    startForgetCountdown();
                } else {
                    showError(response.message || '验证码发送失败');
                    // 恢复按钮状态
                    febtn.disabled = false;
                    febtn.style.cursor = 'pointer';
                    febtn.innerText = originalText;
                }
            },
            error: function(xhr, status, error) {
                console.error('AJAX 错误:', error);
                showError('网络错误，请稍后重试');
                // 恢复按钮状态
                febtn.disabled = false;
                febtn.style.cursor = 'pointer';
                febtn.innerText = originalText;
            }
        });
    });
}

// 倒计时函数
function startForgetCountdown() {
    if (forgetTimer) {
        clearInterval(forgetTimer);
    }

    forgetCountdown = 60;
    if (febtn) {
        febtn.disabled = true;
        febtn.style.cursor = 'not-allowed';
        febtn.innerText = forgetCountdown + 's 后重试';
    }

    forgetTimer = setInterval(function() {
        forgetCountdown--;
        if (febtn) {
            febtn.innerText = forgetCountdown + 's 后重试';
        }

        if (forgetCountdown <= 0) {
            clearInterval(forgetTimer);
            forgetTimer = null;
            if (febtn) {
                febtn.disabled = false;
                febtn.style.cursor = 'pointer';
                febtn.innerText = '获取验证码';
            }
        }
    }, 1000);
}

// 第二步：验证验证码并进入下一步
if (fbtn2) {
    fbtn2.addEventListener('click', function() {
        const emailCode = fecinput ? fecinput.value.trim() : '';

        if (!emailCode) {
            showError('请输入验证码');
            return;
        }

        if (!findPasswordEmail) {
            showError('请先获取验证码');
            return;
        }

        // 验证验证码
        $.ajax({
            url: '/verify_find_password_code/',
            type: 'POST',
            data: {
                'email': findPasswordEmail,
                'code': emailCode,
                'csrfmiddlewaretoken': getCookie('csrftoken')
            },
            success: function(response) {
                if (response.success) {
                    setStep(2);
                    showSuccess('邮箱验证通过');
                } else {
                    showError(response.message || '验证码错误');
                }
            },
            error: function(xhr, status, error) {
                showError('网络错误，请稍后重试');
            }
        });
    });
}

// 第三步：修改密码
if (fbtn3) {
    fbtn3.addEventListener('click', function() {
        const newPassword = fpwinput ? fpwinput.value.trim() : '';

        if (!newPassword) {
            showError('请输入新密码');
            return;
        }

        if (newPassword.length < 6) {
            showError('密码长度不能少于 6 位');
            return;
        }

        // 检查新密码是否与原密码相同
        if (newPassword === findPasswordOldPassword) {
            showError('新密码不能与原密码相同');
            return;
        }

        // 更新密码
        $.ajax({
            url: '/update_password/',
            type: 'POST',
            data: {
                'username': findPasswordUsername,
                'new_password': newPassword,
                'old_password': findPasswordOldPassword,
                'csrfmiddlewaretoken': getCookie('csrftoken')
            },
            success: function(response) {
                if (response.success) {
                    showSuccess('密码修改成功！即将跳转到登录页面...');
                    setStep(3);

                    let time = 5;
                    if (ft) {
                        ft.innerText = time;
                    }

                    const countdownTimer = setInterval(function() {
                        time--;
                        if (ft) ft.innerText = time;

                        if (time <= 0) {
                            clearInterval(countdownTimer);
                            resetForgetState();

                            findPasswordUsername = '';
                            findPasswordEmail = '';
                            findPasswordOldPassword = '';
                            userData = null;

                            const forgetContainer = document.querySelector('.forget-container');
                            const loginContainer = document.querySelector('.login-container');
                            if (forgetContainer) forgetContainer.style.display = 'none';
                            if (loginContainer) loginContainer.style.display = 'block';
                        }
                    }, 1000);
                } else {
                    showError(response.message || '密码修改失败');
                }
            },
            error: function(xhr, status, error) {
                showError('网络错误，请稍后重试');
            }
        });
    });
}
// ==================== 登录功能 ====================


// 页面加载时检查是否有记住的用户名
$(document).ready(function() {
    console.log('页面加载完成，检查记住的用户名...');
    $.ajax({
        url: '/get_remembered_username/',
        type: 'GET',
        success: function(response) {
            if (response.success && response.remembered_username) {
                console.log('找到记住的用户名:', response.remembered_username);
                if (uminp) {
                    uminp.value = response.remembered_username;
                    // 触发 input 事件以更新按钮状态
                    uminp.dispatchEvent(new Event('input'));
                }
            }
        },
        error: function(xhr, status, error) {
            console.error('获取记住的用户名失败:', error);
        }
    });
});

uminp.onfocus = function() {
    this.dataset.placeholderBak = this.placeholder;
    this.placeholder = '';
};
pwinp.onfocus = function() {
    this.dataset.placeholderBak = this.placeholder;
    this.placeholder = '';
};

uminp.onblur = function() {
    this.placeholder = this.dataset.placeholderBak;
};
pwinp.onblur = function() {
    this.placeholder = this.dataset.placeholderBak;
};



uminp.addEventListener('input', function() {
    toggleButtons();
    if (isVerified) resetVerifyState();
});

pwinp.addEventListener('input', function() {
    toggleButtons();
    if (isVerified) resetVerifyState();
});

toggleButtons();

function toggleButtons() {
    const usernameValue = uminp.value.trim();
    const passwordValue = pwinp.value.trim();

    if (usernameValue !== '' && passwordValue !== '') {
        yzbtn.style.display = 'block';
    } else {
        yzbtn.style.display = 'none';
    }
}

// ... existing code ... (验证码相关代码保持不变)

// 登录表单提交
const loginForm = document.querySelector('.login-form');
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const usernameOrEmail = uminp ? uminp.value.trim() : '';
        const password = pwinp ? pwinp.value.trim() : '';
        const rememberMeCheckbox = document.getElementById('remember_me');
        const rememberMe = rememberMeCheckbox ? (rememberMeCheckbox.checked ? 'true' : 'false') : 'false';

        console.log('\n=== 提交登录表单 ===');
        console.log('账号/邮箱:', usernameOrEmail);
        console.log('记住我:', rememberMe);

        // 验证输入
        if (!usernameOrEmail) {
            showError('请输入账号或邮箱');
            return;
        }

        if (!password) {
            showError('请输入密码');
            return;
        }

        // 禁用登录按钮防止重复提交
        if (loginbtn) {
            loginbtn.disabled = true;
            loginbtn.style.opacity = '0.5';
            loginbtn.innerText = '登录中...';
        }

        // 发送登录请求
        $.ajax({
            url: '/login_user/',
            type: 'POST',
            data: {
                'username': usernameOrEmail,
                'password': password,
                'remember_me': rememberMe,
                'csrfmiddlewaretoken': getCookie('csrftoken')
            },
            success: function(response) {
                console.log('登录响应:', response);

                if (response.success) {
                    showSuccess(response.message || '登录成功！即将跳转...');

                    // 延迟跳转
                    setTimeout(function() {
                        window.location.href = response.redirect || '/index/';
                    }, 1000);
                } else {
                    showError(response.message || '登录失败');

                    // 根据响应决定是否清空输入框
                    if (response.need_clear_username) {
                        // 账号或邮箱不存在，清空账号和密码
                        if (uminp) uminp.value = '';
                        if (pwinp) pwinp.value = '';
                        // 重新聚焦到账号输入框
                        if (uminp) uminp.focus();
                        // 重置验证状态
                        resetVerifyState();
                    } else if (response.need_clear_password) {
                        // 密码错误，只清空密码
                        if (pwinp) pwinp.value = '';
                        // 重新聚焦到密码输入框
                        if (pwinp) pwinp.focus();
                    }

                    // 恢复登录按钮
                    if (loginbtn) {
                        loginbtn.disabled = false;
                        loginbtn.style.opacity = '1';
                        loginbtn.innerText = '登录';
                    }
                }
            },
            error: function(xhr, status, error) {
                console.error('登录错误:', {
                    status: status,
                    error: error,
                    responseText: xhr.responseText
                });
                showError('网络错误，请稍后重试');

                // 恢复登录按钮
                if (loginbtn) {
                    loginbtn.disabled = false;
                    loginbtn.style.opacity = '1';
                    loginbtn.innerText = '登录';
                }
            }
        });
    });
}