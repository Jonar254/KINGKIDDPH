
// Select slider elements
const slider = document.querySelector('.slider.special .list.special');
const items = document.querySelectorAll('.slider.special .list.special .item.special');
const dots = document.querySelectorAll('.slider.special .dots.special li');

// Initialize variables
let lengthItems = items.length;
let active = 0;
let isAutoSwipeActive = true; // Flag to track autoswipe state

// Function to navigate to the next slide
function goToNextSlide() {
    active = active + 1 < lengthItems ? active + 1 : 0;
    reloadSlider();
    resetAutoSwipe();
}

// Function to navigate to the previous slide
function goToPrevSlide() {
    active = active - 1 >= 0 ? active - 1 : lengthItems - 1;
    reloadSlider();
    resetAutoSwipe();
}

// Function to reload the slider
function reloadSlider() {
    items.forEach(item => item.classList.remove('active'));
    items[active].classList.add('active');

    let lastActiveDot = document.querySelector('.slider.special .dots.special li.active');
    lastActiveDot.classList.remove('active');
    dots[active].classList.add('active');

    // Trigger paragraph animation
    document.querySelector('.slider.special .list.special .item.special.active .content.special p.special').style.opacity = '1';
}

// Function to reset the autoswipe timer
function resetAutoSwipe() {
    if (isAutoSwipeActive) {
        clearInterval(refreshInterval);
        refreshInterval = setInterval(autoSwipe, 6000);
    }
}

// Function to handle autoswipe
function autoSwipe() {
    if (isAutoSwipeActive) {
        goToNextSlide();
    }
}

// Initialize autoswipe timer
let refreshInterval = setInterval(autoSwipe, 6000);

// Event listeners for dot navigation
dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
        active = index;
        reloadSlider();
        resetAutoSwipe();
    });
});

// Event listeners for swipe gestures
slider.addEventListener('swipeleft', goToNextSlide);
slider.addEventListener('swiperight', goToPrevSlide);

// Pause autoswipe on window blur
window.addEventListener('blur', () => {
    clearInterval(refreshInterval);
});

// Resume autoswipe on window focus
window.addEventListener('focus', resetAutoSwipe);

// Handle transition end event to loop the slider
slider.addEventListener('transitionend', () => {
    if (active === lengthItems) {
        setTimeout(() => {
            slider.style.transition = 'none';
            slider.style.left = 0;
            active = 0;
            setTimeout(() => {
                slider.style.transition = 'left 2s cubic-bezier(0.23, 1, 0.32, 1)';
            }, 300);
        });
    }
});


