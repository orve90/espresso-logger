// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBPp-evesGdf93i6Ms5770qiL4Smdnxo3c",
  authDomain: "espresso-logger-c6a6d.firebaseapp.com",
  projectId: "espresso-logger-c6a6d",
  storageBucket: "espresso-logger-c6a6d.firebasestorage.app",
  messagingSenderId: "36334040646",
  appId: "1:36334040646:web:e0ac359f4b8f6c1cbe7c47"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// App state
let state = {
  shots: [],
  loading: true,
  error: '',
  isFormVisible: false,
  editIndex: null,
  formData: {
    date: new Date().toISOString().split('T')[0],
    coffeeIn: '',
    espressoOut: '',
    grindSize: '',
    extractionTime: '',
    notes: '',
    rating: '3',
    beanName: '',
  }
};

// DOM elements
const app = document.getElementById('app');

// Initial render
render();

// Set up real-time listener for shots
function setupShotsListener() {
  state.loading = true;
  render();
  
  try {
    return db.collection('shots')
      .orderBy('date', 'desc')
      .onSnapshot((snapshot) => {
        const shotData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        state.shots = shotData;
        state.loading = false;
        render();
      }, (error) => {
        console.error("Error loading shots:", error);
        state.error = 'Could not load shots from the cloud.';
        state.loading = false;
        render();
      });
  } catch (error) {
    console.error("Error setting up shots listener:", error);
    state.error = 'Could not connect to the cloud database.';
    state.loading = false;
    render();
    return () => {};
  }
}

// Set up listener when page loads
const unsubscribe = setupShotsListener();

// Cleanup listener on page unload
window.addEventListener('beforeunload', () => {
  unsubscribe();
});

// Helper Functions
function calculateRatio(coffeeIn, espressoOut) {
  try {
    if (coffeeIn && espressoOut) {
      const coffeeInNum = parseFloat(coffeeIn);
      if (coffeeInNum <= 0) return '';
      return (parseFloat(espressoOut) / coffeeInNum).toFixed(1);
    }
    return '';
  } catch (error) {
    console.error("Error calculating ratio:", error);
    return '';
  }
}

function getRatioForShot(shot) {
  try {
    const coffeeIn = parseFloat(shot.coffeeIn);
    const espressoOut = parseFloat(shot.espressoOut);
    
    if (isNaN(coffeeIn) || isNaN(espressoOut) || coffeeIn <= 0) {
      return 'N/A';
    }
    
    return `${(espressoOut / coffeeIn).toFixed(1)}:1`;
  } catch (error) {
    console.error("Error calculating shot ratio:", error);
    return 'Error';
  }
}

function getRatingDisplay(rating) {
  const ratingNum = parseInt(rating) || 0;
  let html = '';
  
  for (let i = 1; i <= 5; i++) {
    if (i <= ratingNum) {
      html += '●';
    } else {
      html += '○';
    }
  }
  
  return html;
}

// Event Handlers
function toggleForm() {
  state.isFormVisible = !state.isFormVisible;
  if (!state.isFormVisible) {
    state.editIndex = null;
    resetForm();
  }
  state.error = '';
  render();
}

function resetForm() {
  state.formData = {
    date: new Date().toISOString().split('T')[0],
    coffeeIn: '',
    espressoOut: '',
    grindSize: '',
    extractionTime: '',
    notes: '',
    rating: '3',
    beanName: '',
  };
}

function handleInputChange(event) {
  const { name, value } = event.target;
  state.formData[name] = value;
  state.error = '';
  render();
}

function handleRatingDotClick(rating) {
  state.formData.rating = rating;
  render();
}

async function handleSubmit(event) {
  event.preventDefault();
  
  try {
    state.loading = true;
    render();
    
    if (state.editIndex !== null) {
      // Update existing shot
      const shotId = state.shots[state.editIndex].id;
      await db.collection('shots').doc(shotId).update({
        ...state.formData,
        updatedAt: new Date().toISOString()
      });
      state.editIndex = null;
    } else {
      // Add new shot
      await db.collection('shots').add({
        ...state.formData,
        createdAt: new Date().toISOString()
      });
    }
    
    resetForm();
    state.isFormVisible = false;
  } catch (error) {
    console.error("Error submitting form:", error);
    state.error = 'An error occurred while saving to the cloud. Please try again.';
  } finally {
    state.loading = false;
    render();
  }
}

function handleEdit(index) {
  try {
    state.formData = { ...state.shots[index] };
    state.editIndex = index;
    state.isFormVisible = true;
    state.error = '';
    render();
  } catch (error) {
    console.error("Error editing shot:", error);
    state.error = 'Could not edit this entry. Please try again.';
    render();
  }
}

async function handleDelete(index) {
  try {
    if (window.confirm('Are you sure you want to delete this shot?')) {
      state.loading = true;
      render();
      
      const shotId = state.shots[index].id;
      await db.collection('shots').doc(shotId).delete();
    }
  } catch (error) {
    console.error("Error deleting shot:", error);
    state.error = 'Could not delete this entry from the cloud. Please try again.';
    state.loading = false;
    render();
  }
}

function cancelEdit() {
  state.editIndex = null;
  state.isFormVisible = false;
  resetForm();
  state.error = '';
  render();
}

// Truncate text if it's too long
function truncateText(text, maxLength = 30) {
  if (!text) return "—";
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Render function
function render() {
  app.innerHTML = `
    <div class="container">
      <header>
        <h1 class="app-title">% <span>ESPRESSO</span></h1>
        <p class="app-subtitle">Shot Logger</p>
      </header>
      
      ${state.loading ? `
        <div class="loading">
          <div class="spinner"></div>
          <span class="loading-text">Syncing</span>
        </div>
      ` : ''}
      
      ${state.error ? `
        <div class="error-message">
          <p>${state.error}</p>
        </div>
      ` : ''}
      
      <div class="controls">
        <button id="toggle-form" class="btn ${state.isFormVisible ? 'btn-secondary' : ''}">
          ${state.isFormVisible ? 'Cancel' : 'New Entry'}
        </button>
        
        <div class="shot-counter">
          ${state.shots.length} ${state.shots.length === 1 ? 'shot' : 'shots'} recorded
        </div>
      </div>
      
      ${state.isFormVisible ? `
        <form id="shot-form" class="form">
          <h2 class="form-title">
            ${state.editIndex !== null ? 'Edit Shot' : 'New Shot'}
          </h2>
          
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Date</label>
              <input
                type="date"
                name="date"
                value="${state.formData.date}"
                class="form-control"
                required
              />
            </div>
            
            <div class="form-group">
              <label class="form-label">Bean Origin</label>
              <input
                type="text"
                name="beanName"
                value="${state.formData.beanName || ''}"
                class="form-control"
                placeholder="Ethiopia Yirgacheffe"
              />
            </div>
            
            <div class="form-group">
              <label class="form-label">Dose (g)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                name="coffeeIn"
                value="${state.formData.coffeeIn || ''}"
                class="form-control"
                placeholder="18.0"
                required
              />
            </div>
            
            <div class="form-group">
              <label class="form-label">Yield (g)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                name="espressoOut"
                value="${state.formData.espressoOut || ''}"
                class="form-control"
                placeholder="36.0"
                required
              />
            </div>
            
            <div class="form-group">
              <label class="form-label">Grind Setting</label>
              <input
                type="text"
                name="grindSize"
                value="${state.formData.grindSize || ''}"
                class="form-control"
                placeholder="2.5"
                required
              />
            </div>
            
            <div class="form-group">
              <label class="form-label">Time (sec)</label>
              <input
                type="number"
                min="1"
                name="extractionTime"
                value="${state.formData.extractionTime || ''}"
                class="form-control"
                placeholder="30"
                required
              />
            </div>
            
            <div class="form-group">
              <label class="form-label">Ratio</label>
              <input
                type="text"
                value="${calculateRatio(state.formData.coffeeIn, state.formData.espressoOut) ? `${calculateRatio(state.formData.coffeeIn, state.formData.espressoOut)}:1` : ''}"
                class="form-control"
                disabled
              />
            </div>
            
            <div class="form-group">
              <label class="form-label">Rating</label>
              <div class="rating-dots">
                ${[1, 2, 3, 4, 5].map(num => `
                  <div 
                    data-rating="${num}" 
                    class="rating-dot ${parseInt(state.formData.rating) >= num ? 'active' : ''}"
                  ></div>
                `).join('')}
                <input type="hidden" name="rating" id="rating-input" value="${state.formData.rating || 3}">
              </div>
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Notes</label>
            <textarea
              name="notes"
              class="form-control"
              placeholder="Tasting notes, observations, improvements..."
              rows="3"
            >${state.formData.notes || ''}</textarea>
          </div>
          
          <div style="display: flex;">
            <button
              type="submit"
              class="btn"
              ${state.loading ? 'disabled' : ''}
            >
              ${state.editIndex !== null ? 'Update' : 'Save'}
            </button>
            
            ${state.editIndex !== null ? `
              <button
                type="button"
                id="cancel-edit"
                class="btn btn-secondary"
                style="margin-left: 1rem;"
                ${state.loading ? 'disabled' : ''}
              >
                Cancel
              </button>
            ` : ''}
          </div>
        </form>
      ` : ''}
      
      ${state.shots.length > 0 ? `
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Bean</th>
                <th class="text-right">In</th>
                <th class="text-right">Out</th>
                <th class="text-right">Ratio</th>
                <th class="text-center">Grind</th>
                <th class="text-right">Time</th>
                <th class="text-center">Rating</th>
                <th>Notes</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${state.shots.map((shot, index) => `
                <tr>
                  <td>${shot.date}</td>
                  <td>${shot.beanName || "—"}</td>
                  <td class="text-right">${shot.coffeeIn}g</td>
                  <td class="text-right">${shot.espressoOut}g</td>
                  <td class="text-right">${getRatioForShot(shot)}</td>
                  <td class="text-center">${shot.grindSize}</td>
                  <td class="text-right">${shot.extractionTime}s</td>
                  <td class="text-center" style="letter-spacing: 0.2em;">${getRatingDisplay(shot.rating)}</td>
                  <td title="${shot.notes || ''}">${truncateText(shot.notes)}</td>
                  <td>
                    <div class="action-buttons">
                      <button
                        class="btn btn-secondary"
                        style="padding: 0.25rem 0.75rem; font-size: 0.75rem;"
                        data-action="edit"
                        data-index="${index}"
                        ${state.loading ? 'disabled' : ''}
                      >
                        Edit
                      </button>
                      <button
                        class="btn"
                        style="padding: 0.25rem 0.75rem; font-size: 0.75rem;"
                        data-action="delete"
                        data-index="${index}"
                        ${state.loading ? 'disabled' : ''}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : !state.loading ? `
        <div class="empty-state">
          <p class="empty-title">No shots recorded</p>
          <p class="empty-subtitle">Click "New Entry" to begin</p>
        </div>
      ` : ''}
      
      <footer>
        <p class="footer-text">% Espresso Logger</p>
      </footer>
    </div>
  `;
  
  // Add event listeners
  document.getElementById('toggle-form')?.addEventListener('click', toggleForm);
  
  if (state.isFormVisible) {
    const form = document.getElementById('shot-form');
    form?.addEventListener('submit', handleSubmit);
    
    // Add listeners to all inputs
    form?.querySelectorAll('input:not([type="hidden"]), textarea').forEach(input => {
      input.addEventListener('change', handleInputChange);
    });
    
    // Add click handlers for rating dots
    document.querySelectorAll('.rating-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        const rating = dot.getAttribute('data-rating');
        state.formData.rating = rating;
        document.getElementById('rating-input').value = rating;
        
        // Update active state of dots
        document.querySelectorAll('.rating-dot').forEach(d => {
          if (parseInt(d.getAttribute('data-rating')) <= parseInt(rating)) {
            d.classList.add('active');
          } else {
            d.classList.remove('active');
          }
        });
      });
    });
    
    document.getElementById('cancel-edit')?.addEventListener('click', cancelEdit);
  }
  
  // Add listeners to edit/delete buttons
  document.querySelectorAll('[data-action="edit"]').forEach(button => {
    button.addEventListener('click', () => {
      handleEdit(parseInt(button.getAttribute('data-index')));
    });
  });
  
  document.querySelectorAll('[data-action="delete"]').forEach(button => {
    button.addEventListener('click', () => {
      handleDelete(parseInt(button.getAttribute('data-index')));
    });
  });
}
