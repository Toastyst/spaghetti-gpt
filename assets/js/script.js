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
  

  
  // Simple search functionality (if search input exists)
  const searchInput = document.querySelector('#search-input');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      const query = this.value.toLowerCase();
      const posts = document.querySelectorAll('.post-preview');
      
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
    });
  });

  // Handle broken thumbnail images
  const thumbnails = document.querySelectorAll('.post-thumbnail');
  thumbnails.forEach(img => {
    img.addEventListener('error', function() {
      this.src = '/SpaghettiStories/assets/images/404_image.jpg';
    });
  });

  // Handle broken inline images
  const inlineImages = document.querySelectorAll('.post-image');
  inlineImages.forEach(img => {
    img.addEventListener('error', function() {
      this.style.display = 'none';
    });
  });
});