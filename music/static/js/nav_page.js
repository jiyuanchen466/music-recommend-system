const leftDiv = document.querySelector('.left');
leftDiv.addEventListener('click', () => {
    window.location.href = '#';
});
document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.getElementById('toggleAdminBtn');
    const adminBtn = document.getElementById('adminLoginBtn');
    const icon = toggleBtn.querySelector('.iconfont');

    let isVisible = false;

    toggleBtn.addEventListener('click', function() {
        if (isVisible) {
            adminBtn.classList.remove('show');
            icon.className = 'iconfont iconfont2 icon-xiangxia';
            isVisible = false;
        } else {
            adminBtn.classList.add('show');
            icon.className = 'iconfont iconfont2 icon-xiangshang';
            isVisible = true;
        }
    });
});
document.addEventListener('DOMContentLoaded', () => {
    const icons = [
        'icon-yinfu',
        'icon-yinfu1',
        'icon-yinfu2',
        'icon-yinfu3',
        'icon-yinfu4',
        'icon-yinfuhao'
    ]

    const bg = document.querySelector('.music-bg')
    if (!bg) return

    const count = Math.floor(Math.random() * 20) + 20

    for (let i = 0; i < count; i++) {
        const icon = document.createElement('i')
        icon.className = `iconfont ${icons[Math.floor(Math.random() * icons.length)]}`

        const size = Math.random() * 60 + 30
        const duration = Math.random() * 20 + 15
        const delay = Math.random() * -20

        icon.style.left = Math.random() * 100 + '%'
        icon.style.top = Math.random() * 100 + '%'
        icon.style.fontSize = size + 'px'
        icon.style.animationDuration = `${duration}s, ${duration / 2}s`
        icon.style.animationDelay = `${delay}s, ${delay}s`

        bg.appendChild(icon)
    }

    document.querySelector('.content2').addEventListener('mousemove', e => {
        const x = (e.clientX / window.innerWidth - 0.5) * 20
        const y = (e.clientY / window.innerHeight - 0.5) * 20
        bg.style.transform = `translate(${x}px, ${y}px)`
    })
})
window.addEventListener('scroll', () => {
    const content3 = document.querySelector('.content3');
    const rect = content3.getBoundingClientRect();
    const midScreen = window.innerHeight / 2;

    if (rect.top <= midScreen) {
        content3.classList.add('active');
    }
});

document.querySelector('.content3').addEventListener('click', function(e) {
    const audio = document.getElementById('clickAudio');
    audio.currentTime = 0;
    audio.play();

    const iconClasses = ['icon-vynil', 'icon-yinle', 'icon-yinle1'];
    const randomClass = iconClasses[Math.floor(Math.random() * iconClasses.length)];

    const note = document.createElement('i');
    note.className = `iconfont ${randomClass} click-note`;

    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    note.style.color = `rgb(${r},${g},${b})`;

    note.style.left = e.clientX + 'px';
    note.style.top = e.clientY + 'px';
    note.style.fontSize = '40px';

    document.body.appendChild(note);

    setTimeout(() => {
        note.remove();
    }, 3000);
});