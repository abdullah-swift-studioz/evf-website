// VisaConsult website JavaScript functionality

// ---------------------------------------------------------------------------
// Firebase, loaded on demand
//
// The SDK is ~400KB across three scripts. It used to be three blocking <script>
// tags in <head>, and only on index.html and contact.html -- so the other 17
// pages carrying a contact form had no Firestore at all and every submission
// from them failed with "Form service unavailable".
//
// Loading it here instead fixes both problems: no page pays for the SDK up
// front, and every page with a form gets it the moment a visitor touches one.
// ---------------------------------------------------------------------------
const FIREBASE_VERSION = '10.12.2';
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDi2KWdwFkQCbuCgj9Qx2KRp7J9ji5iBrY",
    authDomain: "evf-backend.firebaseapp.com",
    projectId: "evf-backend",
    storageBucket: "evf-backend.firebasestorage.app",
    messagingSenderId: "668853277727",
    appId: "1:668853277727:web:b8c47760ba1f11f4fab12a",
    measurementId: "G-KRR863MT1J"
};

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
            if (existing.dataset.loaded) return resolve();
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', reject);
            return;
        }
        const el = document.createElement('script');
        el.src = src;
        el.async = true;
        el.addEventListener('load', () => { el.dataset.loaded = '1'; resolve(); });
        el.addEventListener('error', () => reject(new Error('Failed to load ' + src)));
        document.head.appendChild(el);
    });
}

let firebasePromise = null;

// Resolves with a Firestore instance. Safe to call repeatedly -- the SDK is
// fetched at most once per page.
function getDb() {
    if (firebasePromise) return firebasePromise;

    const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
    firebasePromise = loadScript(`${base}/firebase-app-compat.js`)
        .then(() => loadScript(`${base}/firebase-firestore-compat.js`))
        .then(() => {
            if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
            window.evfDb = firebase.firestore();
            return window.evfDb;
        })
        .catch((err) => {
            // Let the next attempt retry rather than caching the failure.
            firebasePromise = null;
            throw err;
        });

    return firebasePromise;
}

// ---------------------------------------------------------------------------
// Hero background video
//
// Attaches the source only where the download is worth it. The poster is the
// video's first frame, so anyone who does not get the video still sees the
// intended hero -- they just see a still instead of motion.
//
// Skipped on narrow viewports (the video is a full-bleed desktop backdrop),
// when the visitor has asked for reduced motion, and when the browser reports
// Save-Data or a slow connection.
// ---------------------------------------------------------------------------
function initHeroVideo() {
    const video = document.querySelector('video.hero-video[data-src]');
    if (!video) return;

    if (window.innerWidth < 768) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const conn = navigator.connection;
    if (conn) {
        if (conn.saveData) return;
        if (/(^|-)2g$/.test(conn.effectiveType || '')) return;
    }

    const source = document.createElement('source');
    source.src = video.dataset.src;
    source.type = 'video/mp4';
    video.appendChild(source);
    video.load();

    // autoplay can still be refused (e.g. iOS low power mode); the poster stays.
    const attempt = video.play();
    if (attempt && typeof attempt.catch === 'function') attempt.catch(() => {});
}

// Mobile Menu Toggle
document.addEventListener('DOMContentLoaded', function() {
    initHeroVideo();

    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });
    }
    
    // Nav hover colour is handled in styles.css (.nav-link:hover). Doing it with
    // two JS listeners per link meant ~50 listeners per page writing inline
    // styles on every mouse move across the nav.

    // Initialize Swiper only on mobile screens
    if (window.innerWidth < 768) {
        initializeSwiper();
    }

    // Initialize Team Swiper
    initializeTeamSwiper();

    // Initialize Statistics Animation
    initializeStatisticsAnimation();

    // Re-initialize Swiper on resize. Debounced, and only when the mobile
    // breakpoint is actually crossed -- this used to tear down and rebuild both
    // sliders on every resize event, which fires continuously while a mobile
    // browser's address bar collapses during scroll.
    let resizeTimer;
    let wasMobile = window.innerWidth < 768;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            const isMobile = window.innerWidth < 768;
            if (isMobile === wasMobile) return;
            wasMobile = isMobile;

            if (isMobile && !window.swiperInstance) {
                initializeSwiper();
            } else if (!isMobile && window.swiperInstance) {
                window.swiperInstance.destroy(true, true);
                window.swiperInstance = null;
            }

            if (window.teamSwiperInstance) {
                window.teamSwiperInstance.destroy(true, true);
                window.teamSwiperInstance = null;
            }
            initializeTeamSwiper();
        }, 200);
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

// Fade in Why Choose Us card images as they decode.
// The `complete` check matters: on a warm cache the load event has already
// fired by the time this runs, and without it the image would be left at
// opacity 0 permanently.
document.querySelectorAll('.why-choose-card img').forEach(img => {
    if (img.complete) return;
    img.style.opacity = '0';
    img.style.transition = 'opacity 0.3s ease';
    const show = () => { img.style.opacity = '1'; };
    img.addEventListener('load', show, { once: true });
    img.addEventListener('error', show, { once: true });
});

// ---------------------------------------------------------------------------
// Scroll reveal
//
// This previously set opacity:0 on EVERY <section> from JS, then faded them in
// via IntersectionObserver. Three problems: with JS blocked or slow the entire
// page stayed invisible; the hero was hidden until an observer callback fired,
// delaying the largest contentful paint; and writing inline styles to every
// section forced a full style recalculation on load.
//
// Now: content is visible by default. JS opts elements in by adding .reveal,
// and never touches anything in the first viewport. Honours reduced-motion.
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal-visible');
                obs.unobserve(entry.target);   // one-shot; stop observing after reveal
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.why-choose-card, section').forEach(el => {
        // Anything already on screen at load stays untouched, so the hero and
        // first section paint immediately at full opacity.
        if (el.getBoundingClientRect().top < window.innerHeight) return;
        el.classList.add('reveal');
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
        // Warm the SDK as soon as the visitor engages with the form, so it is
        // usually ready by the time they hit submit. Harmless if it fails --
        // the submit handler awaits getDb() again anyway.
        let warmed = false;
        const warm = () => {
            if (warmed) return;
            warmed = true;
            getDb().catch(() => {});
        };
        contactForm.addEventListener('focusin', warm, { once: true });
        contactForm.addEventListener('pointerdown', warm, { once: true });

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
            
            getDb()
                .then((db) => db.collection('submissions').add({
                    ...formObject,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    page: window.location.pathname
                }))
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
