class BlocklistManager {
    constructor() {
        this.blocklists = new Map();
        this.customDomains = new Set();
    }
    
    async loadBlocklists() {
        try {
            // Load YouTube ads blocklist
            await this.loadBlocklist('youtube-ads', 'assets/blocklists/youtube-ads.txt');
            
            // Load general ads blocklist
            await this.loadBlocklist('general-ads', 'assets/blocklists/general-ads.txt');
            
            // Load custom blocklist
            await this.loadBlocklist('custom', 'assets/blocklists/custom.txt');
            
            console.log('Đã load tất cả blocklists');
            
        } catch (error) {
            console.error('Lỗi load blocklists:', error);
        }
    }
    
    async loadBlocklist(name, path) {
        try {
            const response = await fetch(path);
            const text = await response.text();
            
            const domains = this.parseBlocklist(text);
            this.blocklists.set(name, domains);
            
            console.log(`Loaded ${domains.size} domains từ ${name}`);
            
        } catch (error) {
            console.error(`Lỗi load blocklist ${name}:`, error);
            this.blocklists.set(name, new Set()); // Empty set as fallback
        }
    }
    
    parseBlocklist(text) {
        const domains = new Set();
        const lines = text.split('\n');
        
        for (const line of lines) {
            const cleaned = line.trim();
            
            // Skip comments và empty lines
            if (cleaned.startsWith('#') || cleaned.startsWith('!') || !cleaned) {
                continue;
            }
            
            // Parse different formats
            let domain = null;
            
            // AdBlock format: ||domain.com^
            if (cleaned.startsWith('||') && cleaned.endsWith('^')) {
                domain = cleaned.slice(2, -1);
            }
            // Hosts format: 0.0.0.0 domain.com
            else if (cleaned.includes(' ')) {
                const parts = cleaned.split(/\s+/);
                if (parts.length >= 2 && this.isValidDomain(parts[1])) {
                    domain = parts[1];
                }
            }
            // Plain domain
            else if (this.isValidDomain(cleaned)) {
                domain = cleaned;
            }
            
            if (domain) {
                domains.add(domain.toLowerCase());
            }
        }
        
        return domains;
    }
    
    isValidDomain(domain) {
        // Basic domain validation
        const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        return domainRegex.test(domain) && domain.length <= 253;
    }
    
    async updateBlocklists() {
        // Download updated blocklists từ internet
        const updates = [
            {
                name: 'youtube-ads',
                url: 'https://raw.githubusercontent.com/kboghdady/youTube_ads_4_pi-hole/master/black.list'
            },
            {
                name: 'general-ads', 
                url: 'https://someonewhocares.org/hosts/zero/hosts'
            }
        ];
        
        for (const update of updates) {
            try {
                const response = await fetch(update.url);
                const text = await response.text();
                
                // Save to local storage hoặc cache
                await this.saveBlocklist(update.name, text);
                
                // Reload blocklist
                const domains = this.parseBlocklist(text);
                this.blocklists.set(update.name, domains);
                
            } catch (error) {
                console.error(`Lỗi update ${update.name}:`, error);
            }
        }
    }
    
    async saveBlocklist(name, content) {
        // Save blocklist content (trong webOS có thể dùng localStorage hoặc file system)
        try {
            localStorage.setItem(`blocklist_${name}`, content);
        } catch (error) {
            console.error(`Lỗi save blocklist ${name}:`, error);
        }
    }
    
    getAllBlockedDomains() {
        const allDomains = new Set();
        
        // Merge tất cả blocklists
        for (const domains of this.blocklists.values()) {
            domains.forEach(domain => allDomains.add(domain));
        }
        
        // Add custom domains
        this.customDomains.forEach(domain => allDomains.add(domain));
        
        return Array.from(allDomains);
    }
    
    getTotalDomains() {
        return this.getAllBlockedDomains().length;
    }
    
    addCustomDomain(domain) {
        if (this.isValidDomain(domain)) {
            this.customDomains.add(domain.toLowerCase());
            this.saveCustomDomains();
            return true;
        }
        return false;
    }
    
    removeCustomDomain(domain) {
        const removed = this.customDomains.delete(domain.toLowerCase());
        if (removed) {
            this.saveCustomDomains();
        }
        return removed;
    }
    
    saveCustomDomains() {
        try {
            const domains = Array.from(this.customDomains);
            localStorage.setItem('custom_domains', JSON.stringify(domains));
        } catch (error) {
            console.error('Lỗi save custom domains:', error);
        }
    }
    
    loadCustomDomains() {
        try {
            const saved = localStorage.getItem('custom_domains');
            if (saved) {
                const domains = JSON.parse(saved);
                this.customDomains = new Set(domains);
            }
        } catch (error) {
            console.error('Lỗi load custom domains:', error);
        }
    }
}