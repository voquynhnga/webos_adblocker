class YouTubeAdBlocker {
    constructor() {
        this.isBlocking = false;
        this.blockedCount = 0;
        this.dnsProxy = new DNSProxy();
        this.blocklistManager = new BlocklistManager();
        
        this.init();
    }
    
    async init() {
        console.log('Khởi tạo YouTube AdBlocker...');
        
        // Khởi tạo các component
        await this.blocklistManager.loadBlocklists();
        await this.dnsProxy.initialize();
        
        // Bind events
        this.bindEvents();
        
        // Cập nhật UI
        this.updateUI();
        
        // Kiểm tra quyền
        await this.checkPermissions();
    }
    
    bindEvents() {
        document.getElementById('toggleBlock').addEventListener('click', () => {
            this.toggleBlocking();
        });
        
        document.getElementById('updateLists').addEventListener('click', () => {
            this.updateBlocklists();
        });
        
        document.getElementById('settings').addEventListener('click', () => {
            this.showSettings();
        });
    }
    
    async toggleBlocking() {
        if (this.isBlocking) {
            await this.stopBlocking();
        } else {
            await this.startBlocking();
        }
        
        this.updateUI();
    }
    
    async startBlocking() {
        try {
            console.log('Bắt đầu chặn quảng cáo...');
            
            // Khởi động DNS proxy
            await this.dnsProxy.start();
            
            // Cấu hình DNS system
            await this.configureSystemDNS();
            
            this.isBlocking = true;
            this.log('Đã bật chặn quảng cáo YouTube');
            
        } catch (error) {
            console.error('Lỗi khi bật chặn:', error);
            this.log(`Lỗi: ${error.message}`);
        }
    }
    
    async stopBlocking() {
        try {
            console.log('Tắt chặn quảng cáo...');
            
            // Dừng DNS proxy
            await this.dnsProxy.stop();
            
            // Khôi phục DNS system
            await this.restoreSystemDNS();
            
            this.isBlocking = false;
            this.log('Đã tắt chặn quảng cáo');
            
        } catch (error) {
            console.error('Lỗi khi tắt chặn:', error);
            this.log(`Lỗi: ${error.message}`);
        }
    }
    
    async configureSystemDNS() {
        // Cấu hình webOS sử dụng DNS local
        if (window.webOS && window.webOS.service) {
            const systemService = new window.webOS.Service('luna://com.webos.service.connectionmanager');
            
            systemService.call('setdns', {
                dns: ['127.0.0.1', '8.8.8.8'] // Local proxy làm DNS chính
            });
        }
    }
    
    async restoreSystemDNS() {
        // Khôi phục DNS mặc định
        if (window.webOS && window.webOS.service) {
            const systemService = new window.webOS.Service('luna://com.webos.service.connectionmanager');
            
            systemService.call('setdns', {
                dns: ['8.8.8.8', '8.8.4.4']
            });
        }
    }
    
    async updateBlocklists() {
        try {
            this.log('Đang cập nhật danh sách chặn...');
            await this.blocklistManager.updateBlocklists();
            
            if (this.isBlocking) {
                await this.dnsProxy.reloadBlocklists();
            }
            
            this.updateUI();
            this.log('Đã cập nhật danh sách chặn');
            
        } catch (error) {
            console.error('Lỗi cập nhật:', error);
            this.log(`Lỗi cập nhật: ${error.message}`);
        }
    }
    
    updateUI() {
        const statusEl = document.getElementById('status');
        const toggleBtn = document.getElementById('toggleBlock');
        const blockedCountEl = document.getElementById('blockedCount');
        const domainCountEl = document.getElementById('domainCount');
        
        if (this.isBlocking) {
            statusEl.textContent = 'Đang hoạt động';
            statusEl.className = 'status active';
            toggleBtn.textContent = 'Tắt chặn quảng cáo';
        } else {
            statusEl.textContent = 'Đã tắt';
            statusEl.className = 'status inactive';
            toggleBtn.textContent = 'Bật chặn quảng cáo';
        }
        
        blockedCountEl.textContent = this.blockedCount.toLocaleString();
        domainCountEl.textContent = this.blocklistManager.getTotalDomains().toLocaleString();
    }
    
    log(message) {
        const logContainer = document.getElementById('logContainer');
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = `
            <span class="timestamp">${new Date().toLocaleTimeString()}</span>
            <span class="message">${message}</span>
        `;
        
        logContainer.insertBefore(logEntry, logContainer.firstChild);
        
        // Giới hạn số lượng log hiển thị
        while (logContainer.children.length > 50) {
            logContainer.removeChild(logContainer.lastChild);
        }
    }
    
    async checkPermissions() {
        // Kiểm tra quyền truy cập mạng và hệ thống
        try {
            if (window.webOS && window.webOS.service) {
                // Kiểm tra quyền DNS
                const permissionService = new window.webOS.Service('luna://com.webos.service.applicationmanager');
                // Implementation tùy theo webOS SDK
            }
        } catch (error) {
            this.log('Cảnh báo: Một số tính năng có thể không hoạt động do thiếu quyền');
        }
    }
}

// Khởi tạo ứng dụng khi DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.youtubeAdBlocker = new YouTubeAdBlocker();
});