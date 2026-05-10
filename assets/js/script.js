// Optional JavaScript for blog enhancements
document.addEventListener('DOMContentLoaded', function() {
  // Smooth scroll behavior already handled in CSS


  

  
  // Add keyboard navigation for accessibility
  const links = document.querySelectorAll('a');
  
  links.forEach(link => {
    link.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.click();
      }
    });
  });
  

  
  // Live search functionality
  const searchInput = document.querySelector('#search-input');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      const query = this.value.toLowerCase();
      const activeTab = document.querySelector('.tab-content.active');
      const posts = activeTab.querySelectorAll('.post-preview');

      posts.forEach(post => {
        const title = post.querySelector('h2 a').textContent.toLowerCase();
        const excerpt = post.querySelector('.excerpt')?.textContent.toLowerCase() || '';
        const tags = Array.from(post.querySelectorAll('.tag')).map(tag => tag.textContent.toLowerCase()).join(' ');

        if (title.includes(query) || excerpt.includes(query) || tags.includes(query)) {
          post.style.display = 'block';
        } else {
          post.style.display = 'none';
        }
      });
    });
  }

  // Tab functionality
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tab = button.dataset.tab;

      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      tabContents.forEach(content => content.classList.remove('active'));
      document.getElementById(tab).classList.add('active');

      // Clear search when switching tabs
      const searchInput = document.querySelector('#search-input');
      if (searchInput) {
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input'));
      }
    });
  });

  // Handle hash for tag links
  function handleHash() {
    const hash = window.location.hash.substring(1);
    if (hash) {
      const [tab, search] = hash.split('&search=');
      if (tab && search) {
        // Set tab
        const tabButton = document.querySelector(`[data-tab="${tab}"]`);
        if (tabButton) {
          tabButton.click();
        }
        // Set search
        const searchInput = document.querySelector('#search-input');
        if (searchInput) {
          searchInput.value = decodeURIComponent(search);
          searchInput.dispatchEvent(new Event('input'));
        }
      }
    }
  }

  handleHash(); // On load
  window.addEventListener('hashchange', handleHash); // On hash change

  // Handle thumbnail images
  const thumbnails = document.querySelectorAll('.post-thumbnail');
  thumbnails.forEach(img => {
    img.addEventListener('load', function() {
      this.style.opacity = '1';
    });
    img.addEventListener('error', function() {
      this.src = '/SpaghettiStories/assets/images/404_image.jpg';
      this.style.opacity = '1';
    });
  });

  // Handle inline images
  const inlineImages = document.querySelectorAll('.post-image');
  inlineImages.forEach(img => {
    img.addEventListener('load', function() {
      this.style.opacity = '1';
    });
    img.addEventListener('error', function() {
      this.style.display = 'none';
    });
  });
});