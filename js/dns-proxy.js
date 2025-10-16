class DNSProxy {
    constructor() {
        this.server = null;
        this.port = 5353;
        this.blockedDomains = new Set();
        this.upstreamDNS = ['8.8.8.8', '1.1.1.1'];
    }
    
    async initialize() {
        console.log('Khởi tạo DNS Proxy...');
        
        // Load blocked domains
        await this.loadBlockedDomains();
    }
    
    async loadBlockedDomains() {
        try {
            // Đọc các file blocklist 
        
            const blocklistManager = window.youtubeAdBlocker.blocklistManager;
            const domains = await blocklistManager.getAllBlockedDomains();
            
            this.blockedDomains.clear();
            domains.forEach(domain => {
                this.blockedDomains.add(domain.toLowerCase());
            });
            
            console.log(`Đã load ${this.blockedDomains.size} domain bị chặn`);
            
        } catch (error) {
            console.error('Lỗi load blocked domains:', error);
        }
    }
    
    async start() {
        if (this.server) {
            console.log('DNS Proxy đã chạy');
            return;
        }
        
        try {
            // Tạo DNS server (sử dụng webOS service hoặc WebSocket)
            await this.createDNSServer();
            
            console.log(`DNS Proxy đã khởi động trên port ${this.port}`);
            
        } catch (error) {
            console.error('Lỗi khởi động DNS Proxy:', error);
            throw error;
        }
    }
    
    async createDNSServer() {
        // Với webOS, chúng ta cần sử dụng Luna Service
        if (window.webOS && window.webOS.service) {
            // Tạo service DNS custom
            this.server = new window.webOS.Service('luna://com.yourname.youtubeblocker.dns');
            
            // Register DNS handler
            this.server.register('query', (message) => {
                this.handleDNSQuery(message);
            });
            
        } else {
            // Fallback cho development/testing
            this.createWebSocketDNSProxy();
        }
    }
    
    createWebSocketDNSProxy() {
        // Tạo WebSocket server cho DNS proxy (development mode)
        // Trong production sẽ sử dụng Luna Service
        console.log('Chạy DNS proxy qua WebSocket (development mode)');
    }
    
    handleDNSQuery(query) {
        const domain = query.domain.toLowerCase();
        
        // Kiểm tra nếu domain bị chặn
        if (this.isDomainBlocked(domain)) {
            console.log(`Chặn domain: ${domain}`);
            
            // Trả về NXDOMAIN hoặc địa chỉ local
            return this.createBlockedResponse(query);
        }
        
        // Forward query lên upstream DNS
        return this.forwardQuery(query);
    }
    
    isDomainBlocked(domain) {
        // Kiểm tra exact match
        if (this.blockedDomains.has(domain)) {
            return true;
        }
        
        // Kiểm tra subdomain
        const parts = domain.split('.');
        for (let i = 1; i < parts.length; i++) {
            const parentDomain = parts.slice(i).join('.');
            if (this.blockedDomains.has(parentDomain)) {
                return true;
            }
        }
        
        return false;
    }
    
    createBlockedResponse(query) {
        // Increment blocked counter
        if (window.youtubeAdBlocker) {
            window.youtubeAdBlocker.blockedCount++;
        }
        
        return {
            id: query.id,
            response: true,
            authoritative: true,
            answers: [{
                name: query.domain,
                type: 'A',
                data: '0.0.0.0', // Hoặc 127.0.0.1
                ttl: 300
            }]
        };
    }
    
    async forwardQuery(query) {
        try {
            // Forward query lên upstream DNS server
            const response = await this.queryUpstreamDNS(query);
            return response;
            
        } catch (error) {
            console.error('Lỗi forward DNS query:', error);
            return this.createErrorResponse(query);
        }
    }
    
    async queryUpstreamDNS(query) {
        // Implement DNS query lên upstream server
        // Có thể sử dụng fetch với DNS-over-HTTPS
        
        const dohUrl = `https://cloudflare-dns.com/dns-query?name=${query.domain}&type=A`;
        
        const response = await fetch(dohUrl, {
            headers: {
                'Accept': 'application/dns-json'
            }
        });
        
        const data = await response.json();
        
        return {
            id: query.id,
            response: true,
            answers: data.Answer || []
        };
    }
    
    createErrorResponse(query) {
        return {
            id: query.id,
            response: true,
            rcode: 2 // SERVFAIL
        };
    }
    
    async stop() {
        if (this.server) {
            // Dừng DNS server
            if (typeof this.server.close === 'function') {
                this.server.close();
            }
            
            this.server = null;
            console.log('DNS Proxy đã dừng');
        }
    }
    
    async reloadBlocklists() {
        await this.loadBlockedDomains();
        console.log('Đã reload blocklists');
    }
}