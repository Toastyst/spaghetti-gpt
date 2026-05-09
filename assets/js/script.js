// Optional JavaScript for blog enhancements
document.addEventListener('DOMContentLoaded', function() {
  // Smooth scroll behavior already handled in CSS

  // Add loading animation for images
  const images = document.querySelectorAll('img');

  images.forEach(img => {
    img.style.transition = 'opacity 0.3s ease';

    img.addEventListener('load', function() {
      this.style.opacity = '1';
    });

    if (img.complete && img.naturalHeight !== 0) {
      img.style.opacity = '1';
    }
  });
  
  // Add subtle entrance animation for post previews
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);
  
  const postPreviews = document.querySelectorAll('.post-preview, .post');
  postPreviews.forEach(preview => {
    preview.style.opacity = '0';
    preview.style.transform = 'translateY(20px)';
    preview.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(preview);
  });
  
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
  
  // Add a simple fade-in effect for the header
  const header = document.querySelector('header');
  if (header) {
    header.style.opacity = '0';
    header.style.transform = 'translateY(-20px)';
    header.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
    
    setTimeout(() => {
      header.style.opacity = '1';
      header.style.transform = 'translateY(0)';
    }, 100);
  }
  
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
});