$(document).ready(function () {

    // ==========================================
    //  Configuration
    // ==========================================
    const API_BASE     = '';           // same origin (served by Express)
    const PHONE_LENGTH = 10;           // Expected digits for Indian numbers
    const OTP_LENGTH   = 6;
    const COUNTDOWN_SEC = 120;         // 2-minute expiry (matches server)

    let countdownTimer = null;
    let otpExpired     = false;

    // ==========================================
    //  Background Particles
    // ==========================================
    (function createParticles() {
        const $container = $('#bgParticles');
        const colors = [
            'rgba(99,102,241,0.35)',
            'rgba(139,92,246,0.3)',
            'rgba(59,130,246,0.25)',
            'rgba(168,85,247,0.2)',
        ];
        for (let i = 0; i < 35; i++) {
            const size = Math.random() * 4 + 2;
            const $p   = $('<div class="particle"></div>').css({
                width: size,
                height: size,
                left: Math.random() * 100 + '%',
                background: colors[Math.floor(Math.random() * colors.length)],
                animationDuration: (Math.random() * 12 + 10) + 's',
                animationDelay: (Math.random() * 10) + 's',
            });
            $container.append($p);
        }
    })();

    // ==========================================
    //  Utility Helpers
    // ==========================================

    /** Show a toast notification */
    function showToast(message, type) {
        type = type || 'info';
        var icons = {
            success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
            error:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
            info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
        };

        var $toast = $('<div class="toast toast-' + type + '">' + icons[type] + '<span>' + message + '</span></div>');
        $('body').append($toast);

        // Trigger reflow then show
        setTimeout(function () { $toast.addClass('show'); }, 30);
        setTimeout(function () {
            $toast.removeClass('show');
            setTimeout(function () { $toast.remove(); }, 400);
        }, 3200);
    }

    /** Transition between two cards */
    function transitionCards($from, $to) {
        $from.addClass('fade-out');
        setTimeout(function () {
            $from.addClass('hidden').removeClass('fade-out');
            $to.removeClass('hidden').addClass('fade-in');
            setTimeout(function () { $to.removeClass('fade-in'); }, 400);
        }, 300);
    }

    /** Validate the phone number (client-side) */
    function validatePhone(number) {
        var cleaned = number.replace(/\D/g, '');
        if (cleaned.length === 0) {
            return { valid: false, msg: 'Please enter your mobile number.' };
        }
        if (cleaned.length !== PHONE_LENGTH) {
            return { valid: false, msg: 'Mobile number must be ' + PHONE_LENGTH + ' digits.' };
        }

        // Reject all-same-digit numbers (0000000000, 1111111111, …, 9999999999)
        if (/^(\d)\1{9}$/.test(cleaned)) {
            return { valid: false, msg: 'Number cannot be all the same digit.' };
        }

        // Reject common sequential patterns
        var sequential = [
            '1234567890', '0987654321',
            '0123456789', '9876543210',
        ];
        if (sequential.indexOf(cleaned) !== -1) {
            return { valid: false, msg: 'Please enter a real mobile number.' };
        }

        // Indian mobile numbers must start with 6, 7, 8, or 9
        if ($('#countryCode').val() === '+91' && !/^[6-9]/.test(cleaned)) {
            return { valid: false, msg: 'Indian mobile numbers must start with 6-9.' };
        }

        return { valid: true, msg: '' };
    }

    // ==========================================
    //  Step 1 — Phone Number Entry
    // ==========================================

    // Allow only digits in phone field
    $('#phoneNumber').on('input', function () {
        var val = $(this).val().replace(/\D/g, '');
        $(this).val(val);

        var result = validatePhone(val);
        if (val.length === 0) {
            $(this).removeClass('input-error input-valid');
            $('#phoneError').text('');
        } else if (result.valid) {
            $(this).removeClass('input-error').addClass('input-valid');
            $('#phoneError').text('');
        } else {
            $(this).removeClass('input-valid');
            if (val.length >= PHONE_LENGTH) {
                $(this).addClass('input-error');
                $('#phoneError').text(result.msg);
            } else {
                $('#phoneError').text('');
            }
        }
    });

    // Enter key triggers send
    $('#phoneNumber').on('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            $('#sendOtpBtn').trigger('click');
        }
    });

    // Send OTP button — calls the real backend API
    $('#sendOtpBtn').on('click', function () {
        var phone = $('#phoneNumber').val().trim();
        var result = validatePhone(phone);

        if (!result.valid) {
            $('#phoneNumber').addClass('input-error');
            $('#phoneError').text(result.msg);
            $('#phoneInputGroup').css('animation', 'otpShake 0.5s ease');
            setTimeout(function () {
                $('#phoneInputGroup').css('animation', '');
            }, 500);
            return;
        }

        var $btn = $(this);
        $btn.addClass('loading').prop('disabled', true);

        // ── Call backend to send real SMS OTP ──
        $.ajax({
            url: API_BASE + '/api/send-otp',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ phone: phone }),
            success: function (res) {
                $btn.removeClass('loading').prop('disabled', false);

                // Show the OTP in a toast (demo mode — in production this comes via SMS)
                if (res.demo_otp) {
                    showToast('Your OTP is: ' + res.demo_otp, 'info');
                } else {
                    showToast('OTP sent to your phone!', 'success');
                }

                var fullNumber = $('#countryCode').val() + ' ' + phone;
                $('#displayNumber').text(fullNumber);

                // Transition to OTP card
                transitionCards($('#phoneCard'), $('#otpCard'));
                otpExpired = false;

                setTimeout(function () {
                    $('.otp-input').first().focus();
                }, 450);

                // Start the expiry countdown (use server's value if provided)
                var expiry = (res.expirySeconds) || COUNTDOWN_SEC;
                startCountdown(expiry);
            },
            error: function (xhr) {
                $btn.removeClass('loading').prop('disabled', false);
                var msg = 'Failed to send OTP.';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showToast(msg, 'error');
                $('#phoneError').text(msg);
            }
        });
    });

    // ==========================================
    //  Step 2 — OTP Verification
    // ==========================================

    // OTP input handling
    $('.otp-input').on('input', function () {
        var val = $(this).val().replace(/\D/g, '');
        $(this).val(val);

        if (val.length === 1) {
            $(this).addClass('filled').removeClass('error');
            var $next = $(this).next('.otp-input');
            if ($next.length === 0) {
                $next = $(this).next().next('.otp-input');
            }
            if ($next.length) {
                $next.focus();
            }
        }
    });

    // Handle paste
    $('.otp-input').first().on('paste', function (e) {
        e.preventDefault();
        var pasted = (e.originalEvent.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
        if (pasted.length >= OTP_LENGTH) {
            $('.otp-input').each(function (i) {
                $(this).val(pasted[i] || '').addClass('filled');
            });
            $('.otp-input').last().focus();
        }
    });

    // Handle backspace
    $('.otp-input').on('keydown', function (e) {
        if (e.key === 'Backspace' && $(this).val() === '') {
            var $prev = $(this).prev('.otp-input');
            if ($prev.length === 0) {
                $prev = $(this).prev().prev('.otp-input');
            }
            if ($prev.length) {
                $prev.val('').removeClass('filled').focus();
            }
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            $('#verifyOtpBtn').trigger('click');
        }
    });

    // Verify OTP button — calls the real backend API
    $('#verifyOtpBtn').on('click', function () {
        // Check if OTP has expired on the client side
        if (otpExpired) {
            $('#otpError').text('OTP has expired. Please request a new one.');
            showToast('OTP expired. Tap "Resend Code".', 'error');
            return;
        }

        var enteredOTP = '';
        var allFilled = true;

        $('.otp-input').each(function () {
            var v = $(this).val();
            if (!v) { allFilled = false; }
            enteredOTP += v;
        });

        if (!allFilled || enteredOTP.length < OTP_LENGTH) {
            $('#otpError').text('Please enter the complete ' + OTP_LENGTH + '-digit code.');
            $('.otp-input').each(function () {
                if (!$(this).val()) { $(this).addClass('error'); }
            });
            return;
        }

        var $btn = $(this);
        $btn.addClass('loading').prop('disabled', true);
        $('#otpError').text('');

        var phone = $('#phoneNumber').val().trim();

        // ── Call backend to verify OTP ──
        $.ajax({
            url: API_BASE + '/api/verify-otp',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ phone: phone, otp: enteredOTP }),
            success: function () {
                // ✅ Success!
                $('.otp-input').addClass('success').removeClass('error');
                showToast('Verification successful!', 'success');
                clearInterval(countdownTimer);

                setTimeout(function () {
                    var fullNumber = $('#countryCode').val() + ' ' + phone;
                    $('#verifiedNumber').text(fullNumber);
                    $btn.removeClass('loading').prop('disabled', false);
                    transitionCards($('#otpCard'), $('#successCard'));
                }, 600);
            },
            error: function (xhr) {
                $btn.removeClass('loading').prop('disabled', false);
                var msg = 'Incorrect OTP. Please try again.';
                var expired = false;

                if (xhr.responseJSON) {
                    msg = xhr.responseJSON.message || msg;
                    expired = xhr.responseJSON.expired || false;
                }

                if (expired) {
                    // OTP expired or too many attempts — show resend
                    otpExpired = true;
                    clearInterval(countdownTimer);
                    $('#timerText').hide();
                    $('#resendBtn').removeClass('hidden');
                    $('#otpError').text(msg);
                    showToast(msg, 'error');
                    $('.otp-input').val('').removeClass('filled error success');
                } else {
                    // Wrong OTP — shake and clear
                    $('.otp-input').addClass('error').removeClass('filled success');
                    $('#otpError').text(msg);
                    showToast(msg, 'error');

                    setTimeout(function () {
                        $('.otp-input').val('').removeClass('error');
                        $('.otp-input').first().focus();
                    }, 800);
                }
            }
        });
    });

    // Back button
    $('#backBtn').on('click', function () {
        clearInterval(countdownTimer);
        $('.otp-input').val('').removeClass('filled error success');
        $('#otpError').text('');
        transitionCards($('#otpCard'), $('#phoneCard'));
        setTimeout(function () {
            $('#phoneNumber').focus();
        }, 450);
    });

    // ==========================================
    //  Countdown Timer & Resend
    // ==========================================
    function startCountdown(totalSeconds) {
        var seconds = totalSeconds || COUNTDOWN_SEC;
        otpExpired = false;
        $('#countdown').text(seconds);
        $('#timerText').show();
        $('#resendBtn').addClass('hidden');

        clearInterval(countdownTimer);
        countdownTimer = setInterval(function () {
            seconds--;
            $('#countdown').text(seconds);
            if (seconds <= 0) {
                clearInterval(countdownTimer);
                otpExpired = true;
                $('#timerText').hide();
                $('#resendBtn').removeClass('hidden');
                showToast('OTP has expired. Request a new one.', 'error');
            }
        }, 1000);
    }

    // Resend OTP — calls the backend again
    $('#resendBtn').on('click', function () {
        var phone = $('#phoneNumber').val().trim();
        var $btn  = $(this);
        $btn.prop('disabled', true).text('Sending…');

        $.ajax({
            url: API_BASE + '/api/send-otp',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ phone: phone }),
            success: function (res) {
                showToast('New OTP sent to your phone!', 'success');
                $btn.prop('disabled', false).text('Resend Code');

                // Clear fields
                $('.otp-input').val('').removeClass('filled error success');
                $('#otpError').text('');
                $('.otp-input').first().focus();

                var expiry = (res.expirySeconds) || COUNTDOWN_SEC;
                startCountdown(expiry);
            },
            error: function (xhr) {
                $btn.prop('disabled', false).text('Resend Code');
                var msg = 'Failed to resend OTP.';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showToast(msg, 'error');
            }
        });
    });

    // ==========================================
    //  Step 3 — Success / Done
    // ==========================================
    $('#doneBtn').on('click', function () {
        $('#phoneNumber').val('').removeClass('input-error input-valid');
        $('#phoneError').text('');
        $('.otp-input').val('').removeClass('filled error success');
        $('#otpError').text('');
        otpExpired = false;

        transitionCards($('#successCard'), $('#phoneCard'));
        setTimeout(function () {
            $('#phoneNumber').focus();
        }, 450);

        showToast('Ready for another verification!', 'info');
    });

});
