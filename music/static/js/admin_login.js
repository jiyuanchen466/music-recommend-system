// 管理员登陆页面脚本

document.addEventListener('DOMContentLoaded', function() {
    // 密码显示/隐藏功能
    const passwordInput = document.getElementById('admin-password');
    const togglePasswordBtn = document.getElementById('toggle-password');

    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', function() {
            // 切换密码输入框的类型
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                togglePasswordBtn.classList.add('active');
            } else {
                passwordInput.type = 'password';
                togglePasswordBtn.classList.remove('active');
            }
        });
    }

    // 表单验证
    const form = document.querySelector('.admin-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            const username = document.getElementById('admin-username').value.trim();
            const password = document.getElementById('admin-password').value.trim();

            if (!username || !password) {
                e.preventDefault();
                alert('请输入账号和密码');
            }
        });
    }

    // 回车键登陆
    const inputs = document.querySelectorAll('.form-group input');
    inputs.forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                form.submit();
            }
        });
    });
});