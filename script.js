// VisaConsult website JavaScript functionality

// Firebase Initialization (compat SDK)
try {
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
        const firebaseConfig = {
            apiKey: "AIzaSyDi2KWdwFkQCbuCgj9Qx2KRp7J9ji5iBrY",
            authDomain: "evf-backend.firebaseapp.com",
            projectId: "evf-backend",
            storageBucket: "evf-backend.firebasestorage.app",
            messagingSenderId: "668853277727",
            appId: "1:668853277727:web:b8c47760ba1f11f4fab12a",
            measurementId: "G-KRR863MT1J"
        };
        firebase.initializeApp(firebaseConfig);
        try { firebase.analytics(); } catch (_) {}
        window.evfDb = firebase.firestore();
    }
} catch (e) {
    console.error('Firebase init error', e);
}

// Mobile Menu Toggle
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });
    }
    
    // Add hover effects for navigation links
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        link.addEventListener('mouseenter', function() {
            this.style.color = '#0F218B';
        });
        link.addEventListener('mouseleave', function() {
            this.style.color = '#696969';
        });
    });
    
    // Initialize Swiper only on mobile screens
    if (window.innerWidth < 768) {
        initializeSwiper();
    }
    
    // Initialize Team Swiper
    initializeTeamSwiper();
    
    // Initialize Statistics Animation
    initializeStatisticsAnimation();
    
    // Re-initialize Swiper on window resize if needed
    window.addEventListener('resize', function() {
        if (window.innerWidth < 768 && !window.swiperInstance) {
            initializeSwiper();
        } else if (window.innerWidth >= 768 && window.swiperInstance) {
            window.swiperInstance.destroy(true, true);
            window.swiperInstance = null;
        }
        
        // Re-initialize team swiper on resize
        if (window.teamSwiperInstance) {
            window.teamSwiperInstance.destroy(true, true);
            window.teamSwiperInstance = null;
        }
        initializeTeamSwiper();
    });
});

// Initialize Swiper slider for mobile
function initializeSwiper() {
    if (typeof Swiper !== 'undefined') {
        window.swiperInstance = new Swiper('.swiper-container', {
            loop: true,
            slidesPerView: 'auto',
            centeredSlides: true,
            spaceBetween: 20,
            touchRatio: 1,
            touchAngle: 45,
            threshold: 5,
            touchStartPreventDefault: false,
            touchStartForcePreventDefault: false,
            touchMoveStopPropagation: false,
            simulateTouch: true,
            allowTouchMove: true,
            resistance: true,
            resistanceRatio: 0.85,
            preventClicks: true,
            preventClicksPropagation: true,
            slideToClickedSlide: false,
            touchReleaseOnEdges: false,
            uniqueNavElements: true,
            
            // Pagination configuration
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
                dynamicBullets: true,
            },
            
            // Prevent vertical scrolling when swiping horizontally
            onTouchStart: function(swiper, event) {
                // Allow horizontal touch movement
                event.stopPropagation();
            },
            onTouchMove: function(swiper, event) {
                // Prevent vertical scroll during horizontal swipe
                if (Math.abs(event.touches[0].clientX - swiper.touches.startX) > Math.abs(event.touches[0].clientY - swiper.touches.startY)) {
                    event.preventDefault();
                }
            }
        });
    }
}

// Initialize Team Swiper slider
function initializeTeamSwiper() {
    if (typeof Swiper !== 'undefined') {
        window.teamSwiperInstance = new Swiper('.team-swiper', {
            // Responsive breakpoints
            breakpoints: {
                320: {
                    slidesPerView: 1,
                    spaceBetween: 20,
                },
                768: {
                    slidesPerView: 2,
                    spaceBetween: 30,
                },
                1024: {
                    slidesPerView: 3,
                    spaceBetween: 30,
                }
            },
            
            // Navigation
            navigation: {
                nextEl: '.team-swiper-button-next',
                prevEl: '.team-swiper-button-prev',
            },
            
            // Pagination
            pagination: {
                el: '.team-swiper-pagination',
                clickable: true,
                dynamicBullets: true,
            },
            
            // Loop
            loop: true,
            loopFillGroupWithBlank: true,
            
            // Autoplay
            autoplay: {
                delay: 5000,
                disableOnInteraction: false,
                pauseOnMouseEnter: true,
            },
            
            // Touch settings
            touchRatio: 1,
            touchAngle: 45,
            threshold: 5,
            touchStartPreventDefault: false,
            touchStartForcePreventDefault: false,
            touchMoveStopPropagation: false,
            simulateTouch: true,
            allowTouchMove: true,
            resistance: true,
            resistanceRatio: 0.85,
            preventClicks: true,
            preventClicksPropagation: true,
            slideToClickedSlide: false,
            touchReleaseOnEdges: false,
            uniqueNavElements: true,
            
            // Speed
            speed: 600,
            
            // Effects
            effect: 'slide',
            
            // Accessibility
            a11y: {
                enabled: true,
                prevSlideMessage: 'Previous team member',
                nextSlideMessage: 'Next team member',
                firstSlideMessage: 'This is the first team member',
                lastSlideMessage: 'This is the last team member',
            },
            
            // Keyboard control
            keyboard: {
                enabled: true,
                onlyInViewport: true,
            },
            
            // Mouse wheel control
            mousewheel: {
                invert: false,
            },
            
            // Touch events
            onTouchStart: function(swiper, event) {
                event.stopPropagation();
            },
            onTouchMove: function(swiper, event) {
                if (Math.abs(event.touches[0].clientX - swiper.touches.startX) > Math.abs(event.touches[0].clientY - swiper.touches.startY)) {
                    event.preventDefault();
                }
            }
        });
    }
}

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add loading animation for images (only for Why Choose Us cards)
document.querySelectorAll('.why-choose-card img').forEach(img => {
    img.addEventListener('load', function() {
        this.style.opacity = '1';
    });
    
    // Set initial opacity for smooth loading
    img.style.opacity = '0';
    img.style.transition = 'opacity 0.3s ease';
});

// Add intersection observer for scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe elements for scroll animations
document.addEventListener('DOMContentLoaded', function() {
    const animatedElements = document.querySelectorAll('.why-choose-card, .hero-content, section');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

// Accordion functionality for About page
function toggleAccordion(button) {
    const accordionItem = button.parentElement;
    const isActive = accordionItem.classList.contains('active');
    
    // Close all accordion items
    document.querySelectorAll('.accordion-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Open clicked item if it wasn't active
    if (!isActive) {
        accordionItem.classList.add('active');
    }
}

// Animated Statistics Counter
function animateCounter(element, target, duration, suffix = '') {
    let start = 0;
    const increment = target / (duration / 16); // 60fps
    
    function updateCounter() {
        start += increment;
        if (start < target) {
            element.textContent = Math.floor(start) + suffix;
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = target + suffix;
        }
    }
    
    updateCounter();
}

// Statistics Animation with Intersection Observer
function initializeStatisticsAnimation() {
    const statsSection = document.querySelector('section[style*="background-color: #0F218B"]');
    if (!statsSection) return;
    
    const stat1 = document.getElementById('stat-1');
    const stat2 = document.getElementById('stat-2');
    const stat3 = document.getElementById('stat-3');
    
    if (!stat1 || !stat2 || !stat3) return;
    
    const observerOptions = {
        threshold: 0.5,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Animate the counters
                animateCounter(stat1, 98, 2000, '%');
                animateCounter(stat2, 5000, 2500, '+');
                animateCounter(stat3, 14, 1500, '+');
                
                // Stop observing after animation starts
                statsObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    statsObserver.observe(statsSection);
}

// Contact Form Handling
document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(contactForm);
            const formObject = {};
            formData.forEach((value, key) => {
                formObject[key] = value;
            });
            
            // Basic validation
            if (!formObject.firstName || !formObject.lastName || !formObject.email || !formObject.phone || !formObject.service || !formObject.message) {
                alert('Please fill in all required fields.');
                return;
            }
            
            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formObject.email)) {
                alert('Please enter a valid email address.');
                return;
            }
            
            // Phone validation (basic)
            const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
            if (!phoneRegex.test(formObject.phone)) {
                alert('Please enter a valid phone number.');
                return;
            }
            
            // Submit to Firestore
            const submitButton = contactForm.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            
            submitButton.textContent = 'Sending...';
            submitButton.disabled = true;
            
            if (!window.evfDb) {
                alert('Form service unavailable. Please try again later.');
                submitButton.textContent = originalText;
                submitButton.disabled = false;
                return;
            }
            
            const payload = {
                ...formObject,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                page: window.location.pathname
            };
            
            window.evfDb.collection('submissions').add(payload)
                .then(() => {
                    alert('Thank you for your message! We will get back to you within 24 hours.');
                    contactForm.reset();
                })
                .catch((err) => {
                    console.error('Failed to submit form:', err);
                    alert('Sorry, something went wrong submitting your message. Please try again.');
                })
                .finally(() => {
                    submitButton.textContent = originalText;
                    submitButton.disabled = false;
                });
        });
        
        // Add real-time validation feedback
        const inputs = contactForm.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('blur', function() {
                if (this.hasAttribute('required') && !this.value.trim()) {
                    this.style.borderColor = '#ef4444';
                } else {
                    this.style.borderColor = '#d1d5db';
                }
            });
            
            input.addEventListener('input', function() {
                if (this.style.borderColor === 'rgb(239, 68, 68)') {
                    this.style.borderColor = '#d1d5db';
                }
            });
        });
    }
});
