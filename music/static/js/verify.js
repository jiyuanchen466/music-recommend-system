$(document).ready(function() {
    let clickOrder = [];
    let targetChars = [];
    let currentCharIndex = 0;
    let isVerified = false;

    // 获取随机颜色
    function getRandomColor() {
        const colors = ['#FF5733', '#33FF57', '#3357FF', '#F3FF33', '#FF33F3', '#33FFF3'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // 初始化验证码
    function initVerify() {
        $.get('/verify/', function(data) {
            console.log('验证码数据:', data); // 调试用
            const { text, img_url } = data;
            $('#verify-text').text(text);
            targetChars = text.split('');
            $('#verify-img').css('background-image', `url(${img_url})`);
            $('#verify-img').css('background-size', 'cover');
            $('#verify-img').css('background-position', 'center');

            // 清除之前的字符
            $('.char-overlay').remove();

            // 添加每个字符到图片上
            targetChars.forEach((char, index) => {
                const $char = $('<div class="char-overlay">' + char + '</div>');
                $char.css({
                    position: 'absolute',
                    left: `${Math.random() * 80 + 10}%`,
                    top: `${Math.random() * 80 + 10}%`,
                    transform: `rotate(${Math.random() * 360}deg)`,
                    color: getRandomColor(),
                    fontSize: `${Math.floor(Math.random() * 15 + 17)}px`,
                    fontFamily: 'SimHei, sans-serif',
                    fontWeight: 'bold',
                    zIndex: 100,
                    userSelect: 'none',
                    cursor: 'pointer'
                });
                $char.data('index', index);
                $('#verify-img').append($char);
            });

            // 重置状态
            clickOrder = [];
            currentCharIndex = 0;
            isVerified = false;
            $('.verify-btn').prop('disabled', true);
            $('.verify-error').hide();
            $('.verify-success').hide();
        }).fail(function(xhr, status, error) {
            alert('加载验证码失败！\n错误信息：' + error);
            console.error('请求失败:', xhr, status, error);
        });
    }

    // 点击字符事件
    $(document).on('click', '.char-overlay', function() {
        const index = $(this).data('index');
        if (isVerified || clickOrder.includes(index)) return;

        // 显示序号
        const orderNum = currentCharIndex + 1;
        $(this).html(`<span style="color:#fff; font-size:20px;">①${orderNum}</span>`);

        clickOrder.push(index);
        currentCharIndex++;

        // 如果全部点击完成，启用确认按钮
        if (currentCharIndex === targetChars.length) {
            $('.verify-btn').prop('disabled', false);
        }
    });

    // 点击“确定”按钮
    $('.verify-btn').click(function() {
        if (clickOrder.length !== targetChars.length) return;

        // 验证顺序是否一致
        const correct = clickOrder.every((val, idx) => val === idx);
        if (correct) {
            $('.verify-success').show();
            setTimeout(() => {
                $('.verify-window').hide();
                $('.login-btn').prop('disabled', false);
                $('.login-btn').css('background-color', 'purple');
            }, 1000);
        } else {
            $('.verify-error').show();
            // 清除所有序号
            $('.char-overlay').each(function() {
                const index = $(this).data('index');
                if (clickOrder.indexOf(index) >= currentCharIndex - 1) {
                    $(this).html($(this).data('original') || '');
                }
            });
        }
    });

    // 刷新验证码
    $('#verify-again').click(function() {
        initVerify();
    });

    // 关闭验证码窗口
    $('#verify-quit').click(function() {
        $('.verify-window').hide();
    });

    // 点击“点击验证”触发初始化
    $('.yanzheng').click(function() {
        initVerify();
        $('.verify-window').show();
    });

    // 页面加载完成后隐藏验证码窗口
    $('.verify-window').hide();
});