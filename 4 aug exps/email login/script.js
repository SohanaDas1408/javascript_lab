document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const submitBtn = document.getElementById('submitBtn');
    const toast = document.getElementById('toast');

    // Toggle password visibility
    togglePasswordBtn.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        // Toggle icon
        const icon = togglePasswordBtn.querySelector('i');
        if (type === 'text') {
            icon.classList.remove('ri-eye-line');
            icon.classList.add('ri-eye-off-line');
        } else {
            icon.classList.remove('ri-eye-off-line');
            icon.classList.add('ri-eye-line');
        }
    });

    // Form Validation and Submission
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        let isValid = true;

        // Reset errors
        resetError(emailInput);
        resetError(passwordInput);

        // Validate email
        if (!validateEmail(emailInput.value)) {
            showError(emailInput);
            isValid = false;
        }

        // Validate password
        if (passwordInput.value.length < 8) {
            showError(passwordInput);
            isValid = false;
        }

        // Simulate API call if valid
        if (isValid) {
            setLoading(true);
            
            // Simulate network request
            setTimeout(() => {
                setLoading(false);
                showToast();
                
                // Reset form after successful login
                setTimeout(() => {
                    loginForm.reset();
                    // Optional: redirect user here
                    // window.location.href = '/dashboard';
                }, 2000);
            }, 1500);
        }
    });

    // Clear error on input
    emailInput.addEventListener('input', () => resetError(emailInput));
    passwordInput.addEventListener('input', () => resetError(passwordInput));

    // Helper Functions
    function validateEmail(email) {
        const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }

    function showError(inputElement) {
        const inputGroup = inputElement.closest('.input-group');
        inputGroup.classList.add('error');
    }

    function resetError(inputElement) {
        const inputGroup = inputElement.closest('.input-group');
        inputGroup.classList.remove('error');
    }

    function setLoading(isLoading) {
        if (isLoading) {
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;
        } else {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    }

    function showToast() {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    
    // Add interactive hover effect for the login card
    const card = document.querySelector('.login-card');
    
    document.addEventListener('mousemove', (e) => {
        // Only apply effect on larger screens to avoid issues on mobile
        if (window.innerWidth > 768) {
            const xAxis = (window.innerWidth / 2 - e.pageX) / 50;
            const yAxis = (window.innerHeight / 2 - e.pageY) / 50;
            
            card.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg) translateY(0)`;
        }
    });
    
    // Reset transform on mouse leave
    document.addEventListener('mouseleave', () => {
        card.style.transform = 'rotateY(0deg) rotateX(0deg) translateY(0)';
        card.style.transition = 'transform 0.5s ease';
    });
    
    // Remove transition when moving for smoother effect
    card.addEventListener('mouseenter', () => {
        card.style.transition = 'none';
    });
});
