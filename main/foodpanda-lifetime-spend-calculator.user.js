// ==UserScript==
// @name         Foodpanda Order Calculator (UI Version)
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  Calculate total spending on Foodpanda orders
// @author       https://github.com/alikazmidev
// @match        https://www.foodpanda.pk/new/orders*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    let processedOrders = new Set();
    let totalSpent = 0;
    let orderCount = 0;
    let isAutoScrolling = false;

    // Create simple floating panel
    const panel = document.createElement('div');
    panel.innerHTML = `
        <div style="background: linear-gradient(135deg, #e21b70 0%, #ff6b9d 100%); padding: 20px; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); min-width: 250px;">
            <h3 style="margin: 0 0 15px 0; color: white; font-size: 18px; font-weight: 600;">
                🍔 Foodpanda Stats
            </h3>
            <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px; margin-bottom: 12px;">
                <div style="color: rgba(255,255,255,0.9); font-size: 12px; margin-bottom: 4px;">Total Spent</div>
                <div id="fp-total" style="color: white; font-size: 28px; font-weight: 700;">Rs. 0</div>
            </div>
            <div style="background: rgba(255,255,255,0.2); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                <div style="color: rgba(255,255,255,0.9); font-size: 12px; margin-bottom: 4px;">Total Orders</div>
                <div id="fp-count" style="color: white; font-size: 22px; font-weight: 600;">0</div>
            </div>
            <div style="background: rgba(255,255,255,0.2); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                <div style="color: rgba(255,255,255,0.9); font-size: 12px; margin-bottom: 4px;">Average Order</div>
                <div id="fp-avg" style="color: white; font-size: 22px; font-weight: 600;">Rs. 0</div>
            </div>
            <button id="fp-scroll-btn" style="width: 100%; background: white; color: #e21b70; border: none; padding: 10px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 13px;">
                📜 Auto-scroll & Load All
            </button>
            <div id="fp-status" style="margin-top: 10px; color: rgba(255,255,255,0.9); font-size: 11px; text-align: center; min-height: 16px;"></div>
        </div>
    `;
    
    panel.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    function showStatus(message) {
        const statusEl = document.getElementById('fp-status');
        if (statusEl) {
            statusEl.textContent = message;
        }
    }

    function calculateTotals() {
        const orderContainers = document.querySelectorAll('.order-item-container');
        
        totalSpent = 0;
        orderCount = 0;
        processedOrders.clear();

        orderContainers.forEach(container => {
            const orderId = container.getAttribute('data-testid');
            
            if (!orderId || processedOrders.has(orderId)) {
                return;
            }

            const priceElement = container.querySelector('.item-price');
            
            if (priceElement) {
                const priceText = priceElement.textContent.trim();
                const match = priceText.match(/Rs\.\s*([\d,]+\.?\d*)/);
                
                if (match) {
                    const price = parseFloat(match[1].replace(/,/g, ''));
                    if (!isNaN(price)) {
                        totalSpent += price;
                        orderCount++;
                        processedOrders.add(orderId);
                    }
                }
            }
        });

        updateDisplay();
    }

    function updateDisplay() {
        const totalEl = document.getElementById('fp-total');
        const countEl = document.getElementById('fp-count');
        const avgEl = document.getElementById('fp-avg');
        
        if (totalEl && countEl && avgEl) {
            totalEl.textContent = `Rs. ${totalSpent.toLocaleString('en-PK', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            countEl.textContent = orderCount;
            
            const average = orderCount > 0 ? totalSpent / orderCount : 0;
            avgEl.textContent = `Rs. ${average.toLocaleString('en-PK', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        }
    }

    function autoScroll() {
        if (isAutoScrolling) return;
        
        isAutoScrolling = true;
        showStatus('🔄 Auto-scrolling...');
        
        const scrollBtn = document.getElementById('fp-scroll-btn');
        if (scrollBtn) scrollBtn.disabled = true;

        let lastOrderCount = 0;
        let noNewOrdersCount = 0;

        const scrollInterval = setInterval(() => {
            // Scroll to bottom
            window.scrollTo(0, document.body.scrollHeight);
            
            // Wait a bit for orders to load, then calculate
            setTimeout(() => {
                calculateTotals();
                
                // Check if we got new orders
                if (orderCount === lastOrderCount) {
                    noNewOrdersCount++;
                    showStatus(`⏳ Waiting for more orders... (${orderCount} found)`);
                    
                    // If no new orders appear after 5 attempts, we're done
                    if (noNewOrdersCount >= 5) {
                        clearInterval(scrollInterval);
                        isAutoScrolling = false;
                        if (scrollBtn) scrollBtn.disabled = false;
                        showStatus('✓ Done! All orders loaded');
                        setTimeout(() => window.scrollTo(0, 0), 500);
                    }
                } else {
                    noNewOrdersCount = 0;
                    showStatus(`📦 Loading orders... (${orderCount} found)`);
                }
                
                lastOrderCount = orderCount;
            }, 1000);
        }, 2000);
    }

    function init() {
        if (!document.body) {
            setTimeout(init, 200);
            return;
        }

        document.body.appendChild(panel);
        
        // Set up button click
        const scrollBtn = document.getElementById('fp-scroll-btn');
        if (scrollBtn) {
            scrollBtn.addEventListener('click', autoScroll);
        }

        // Initial calculation and auto-start scroll
        setTimeout(() => {
            calculateTotals();
            showStatus('Starting auto-scroll...');
            setTimeout(autoScroll, 1000);
        }, 2000);

        console.log('Foodpanda Calculator: Ready ✓');
    }

    // Wait for page load
    setTimeout(init, 3000);
})();