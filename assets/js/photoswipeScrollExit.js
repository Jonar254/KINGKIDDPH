// Create a module file named `photoswipeScrollExit.js`
export function setupScrollToExit(lightbox) {
    let lastScrollTop = 0;
    const scrollThreshold = 100; // Scroll distance to trigger exit
    let active = false; // State to track if the listener should be active

    const checkScroll = () => {
        const st = window.pageYOffset || document.documentElement.scrollTop;
        if (Math.abs(lastScrollTop - st) > scrollThreshold && active) {
            lightbox.pswp.close();
            lastScrollTop = st;
        }
        lastScrollTop = st;
    };

    const scrollHandler = () => {
        requestAnimationFrame(checkScroll);
    };

    lightbox.on('afterInit', () => {
        window.addEventListener('scroll', scrollHandler, { passive: true });
        active = true;
    });

    lightbox.on('destroy', () => {
        window.removeEventListener('scroll', scrollHandler);
        active = false;
    });
}
