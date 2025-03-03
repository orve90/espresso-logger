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

// Excel export function
function exportToExcel() {
  if (state.shots.length === 0) {
    alert('No data to export.');
    return;
  }
  
  try {
    // Convert shots data to csv format
    const headers = ['Date', 'Bean Origin', 'Dose (g)', 'Yield (g)', 'Ratio', 'Grind Setting', 'Time (s)', 'Rating', 'Notes'];
    
    // Create csv content
    let csvContent = headers.join(',') + '\n';
    
    state.shots.forEach(shot => {
      const ratio = getRatioForShot(shot);
      // Escape notes to handle commas and quotes
      const escapedNotes = shot.notes ? `"${shot.notes.replace(/"/g, '""')}"` : '';
      
      const row = [
        shot.date,
        shot.beanName || '',
        shot.coffeeIn,
        shot.espressoOut,
        ratio,
        shot.grindSize,
        shot.extractionTime,
        shot.rating,
        escapedNotes
      ];
      
      csvContent += row.join(',') + '\n';
    });
    
    // Create a blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Set up download
    link.setAttribute('href', url);
    link.setAttribute('download', `espresso-shots-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.display = 'none';
    
    // Add to DOM, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    alert('Failed to export data. Please try again.');
  }
}

// Handles opening a modal to view full notes
function viewNotes(notes) {
  const modal = document.createElement('div');
  modal.className = 'notes-modal';
  modal.innerHTML = `
    <div class="notes-modal-content">
      <div class="notes-modal-header">
        <h2>Notes</h2>
        <span class="close-modal">&times;</span>
      </div>
      <div class="notes-modal-body">
        <p>${notes || 'No notes'}</p>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Close when clicking the X
  modal.querySelector('.close-modal').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  // Close when clicking outside the modal content
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

// Render function
function render() {
  app.innerHTML = `
    <div style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
      <header style="margin: 40px 0 20px;">
        <h1 style="font-size: 36px; font-weight: 300; text-transform: uppercase; letter-spacing: 0.05em; margin: 0;">% <span style="letter-spacing: 0.2em;">ESPRESSO</span></h1>
        <p style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.2em; color: #666; margin: 10px 0 0;">Shot Logger</p>
      </header>
      
      ${state.loading ? `
        <div style="display: flex; justify-content: center; padding: 20px;">
          <div style="border: 2px solid #e0e0e0; border-top: 2px solid #000; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite; margin-right: 10px;"></div>
          <span style="font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; color: #666;">Syncing</span>
        </div>
      ` : ''}
      
      ${state.error ? `
        <div style="background-color: #f5f5f5; border: 1px solid #e0e0e0; padding: 15px; margin-bottom: 20px; font-size: 14px;">
          <p>${state.error}</p>
        </div>
      ` : ''}
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <div>
          <button id="toggle-form" style="
            padding: 8px 16px;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            font-weight: 300;
            border: none;
            cursor: pointer;
            background-color: ${state.isFormVisible ? '#e0e0e0' : '#000'};
            color: ${state.isFormVisible ? '#000' : '#fff'};
          ">
            ${state.isFormVisible ? 'Cancel' : 'New Entry'}
          </button>
          
          ${!state.isFormVisible && state.shots.length > 0 ? `
            <button id="export-excel" style="
              padding: 8px 16px;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              font-weight: 300;
              border: none;
              cursor: pointer;
              background-color: #e0e0e0;
              color: #000;
              margin-left: 8px;
            ">
              Export
            </button>
          ` : ''}
        </div>
        
        <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #666;">
          ${state.shots.length} ${state.shots.length === 1 ? 'shot' : 'shots'} recorded
        </div>
      </div>
      
      ${state.isFormVisible ? `
        <form id="shot-form" style="background-color: #f5f5f5; padding: 24px; margin-bottom: 40px;">
          <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 0; margin-bottom: 24px; font-weight: 300;">
            ${state.editIndex !== null ? 'Edit Shot' : 'New Shot'}
          </h2>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 24px; margin-bottom: 24px;">
            <div>
              <label style="display: block; margin-bottom: 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #666;">Date</label>
              <input
                type="date"
                name="date"
                value="${state.formData.date}"
                style="width: 100%; padding: 8px; font-size: 14px; border: 1px solid #e0e0e0; background-color: #fff; font-family: inherit;"
                required
              />
            </div>
            
            <div>
              <label style="display: block; margin-bottom: 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #666;">Bean Origin</label>
              <input
                type="text"
                name="beanName"
                value="${state.formData.beanName || ''}"
                style="width: 100%; padding: 8px; font-size: 14px; border: 1px solid #e0e0e0; background-color: #fff; font-family: inherit;"
                placeholder="Ethiopia Yirgacheffe"
              />
            </div>
            
            <div>
              <label style="display: block; margin-bottom: 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #666;">Dose (g)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                name="coffeeIn"
                value="${state.formData.coffeeIn || ''}"
                style="width: 100%; padding: 8px; font-size: 14px; border: 1px solid #e0e0e0; background-color: #fff; font-family: inherit;"
                placeholder="18.0"
                required
              />
            </div>
            
            <div>
              <label style="display: block; margin-bottom: 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #666;">Yield (g)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                name="espressoOut"
                value="${state.formData.espressoOut || ''}"
                style="width: 100%; padding: 8px; font-size: 14px; border: 1px solid #e0e0e0; background-color: #fff; font-family: inherit;"
                placeholder="36.0"
                required
              />
            </div>
            
            <div>
              <label style="display: block; margin-bottom: 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #666;">Grind Setting</label>
              <input
                type="text"
                name="grindSize"
                value="${state.formData.grindSize || ''}"
                style="width: 100%; padding: 8px; font-size: 14px; border: 1px solid #e0e0e0; background-color: #fff; font-family: inherit;"
                placeholder="2.5"
                required
              />
            </div>
            
            <div>
              <label style="display: block; margin-bottom: 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #666;">Time (sec)</label>
              <input
                type="number"
                min="1"
                name="extractionTime"
                value="${state.formData.extractionTime || ''}"
                style="width: 100%; padding: 8px; font-size: 14px; border: 1px solid #e0e0e0; background-color: #fff; font-family: inherit;"
                placeholder="30"
                required
              />
            </div>
            
            <div>
              <label style="display: block; margin-bottom: 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #666;">Ratio</label>
              <input
                type="text"
                value="${calculateRatio(state.formData.coffeeIn, state.formData.espressoOut) ? `${calculateRatio(state.formData.coffeeIn, state.formData.espressoOut)}:1` : ''}"
                style="width: 100%; padding: 8px; font-size: 14px; background-color: #e0e0e0; color: #666; border: none; font-family: inherit;"
                disabled
              />
            </div>
            
            <div>
              <label style="display: block; margin-bottom: 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #666;">Rating</label>
              <div style="display: flex; align-items: center; gap: 16px; margin-top: 8px;">
                ${[1, 2, 3, 4, 5].map(num => `
                  <div 
                    data-rating="${num}" 
                    class="rating-dot" 
                    style="
                      width: 16px; 
                      height: 16px; 
                      border-radius: 50%; 
                      background-color: ${parseInt(state.formData.rating) >= num ? '#000' : '#e0e0e0'};
                      cursor: pointer;
                      transition: background-color 0.2s ease;
                    "
                  ></div>
                `).join('')}
                <input type="hidden" name="rating" id="rating-input" value="${state.formData.rating || 3}">
              </div>
            </div>
          </div>
          
          <div style="margin-bottom: 24px;">
            <label style="display: block; margin-bottom: 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #666;">Notes</label>
            <textarea
              name="notes"
              style="width: 100%; padding: 8px; font-size: 14px; border: 1px solid #e0e0e0; background-color: #fff; font-family: inherit; resize: vertical;"
              placeholder="Tasting notes, observations, improvements..."
              rows="3"
            >${state.formData.notes || ''}</textarea>
          </div>
          
          <div style="display: flex;">
            <button
              type="submit"
              style="
                padding: 8px 24px;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                font-weight: 300;
                border: none;
                cursor: pointer;
                background-color: #000;
                color: #fff;
                ${state.loading ? 'opacity: 0.5; cursor: not-allowed;' : ''}
              "
              ${state.loading ? 'disabled' : ''}
            >
              ${state.editIndex !== null ? 'Update' : 'Save'}
            </button>
            
            ${state.editIndex !== null ? `
              <button
                type="button"
                id="cancel-edit"
                style="
                  padding: 8px 24px;
                  font-size: 12px;
                  text-transform: uppercase;
                  letter-spacing: 0.1em;
                  font-weight: 300;
                  border: none;
                  cursor: pointer;
                  background-color: #e0e0e0;
                  color: #000;
                  margin-left: 12px;
                  ${state.loading ? 'opacity: 0.5; cursor: not-allowed;' : ''}
                "
                ${state.loading ? 'disabled' : ''}
              >
                Cancel
              </button>
            ` : ''}
          </div>
        </form>
      ` : ''}
      
      ${state.shots.length > 0 ? `
        <div style="border: 1px solid #e0e0e0; overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #000; color: #fff;">
                <th style="padding: 12px 16px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 300; text-align: left;">Date</th>
                <th style="padding: 12px 16px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 300; text-align: left;">Bean</th>
                <th style="padding: 12px 16px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 300; text-align: right;">In</th>
                <th style="padding: 12px 16px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 300; text-align: right;">Out</th>
                <th style="padding: 12px 16px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 300; text-align: right;">Ratio</th>
                <th style="padding: 12px 16px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 300; text-align: center;">Grind</th>
                <th style="padding: 12px 16px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 300; text-align: right;">Time</th>
                <th style="padding: 12px 16px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 300; text-align: center;">Rating</th>
                <th style="padding: 12px 16px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 300; text-align: left;">Notes</th>
                <th style="padding: 12px 16px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 300; text-align: center;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${state.shots.map((shot, index) => `
                <tr style="background-color: ${index % 2 === 0 ? '#fff' : '#f5f5f5'}; border-top: 1px solid #e0e0e0;">
                  <td style="padding: 12px 16px; font-size: 14px;">${shot.date}</td>
                  <td style="padding: 12px 16px; font-size: 14px;">${shot.beanName || "—"}</td>
                  <td style="padding: 12px 16px; font-size: 14px; text-align: right;">${shot.coffeeIn}g</td>
                  <td style="padding: 12px 16px; font-size: 14px; text-align: right;">${shot.espressoOut}g</td>
                  <td style="padding: 12px 16px; font-size: 14px; text-align: right;">${getRatioForShot(shot)}</td>
                  <td style="padding: 12px 16px; font-size: 14px; text-align: center;">${shot.grindSize}</td>
                  <td style="padding: 12px 16px; font-size: 14px; text-align: right;">${shot.extractionTime}s</td>
                  <td style="padding: 12px 16px; font-size: 14px; text-align: center; letter-spacing: 0.2em;">${getRatingDisplay(shot.rating)}</td>
                  <td style="padding: 12px 16px; font-size: 14px;">
                    ${shot.notes ? 
                      `<button 
                        class="notes-btn" 
                        data-notes="${shot.notes.replace(/"/g, '&quot;')}" 
                        style="background: none; border: none; cursor: pointer; color: #000; text-decoration: underline; padding: 0; font-size: 14px; font-family: inherit;"
                      >View</button>` : 
                      '—'}
                  </td>
                  <td style="padding: 12px 16px; font-size: 14px;">
                    <div style="display: flex; justify-content: center; gap: 8px;">
                      <button
                        data-action="edit"
                        data-index="${index}"
                        style="
                          background-color: #e0e0e0;
                          color: #000;
                          padding: 4px 12px;
                          font-size: 12px;
                          text-transform: uppercase;
                          letter-spacing: 0.1em;
                          border: none;
                          cursor: pointer;
                          font-family: inherit;
                          ${state.loading ? 'opacity: 0.5; cursor: not-allowed;' : ''}
                        "
                        ${state.loading ? 'disabled' : ''}
                      >
                        Edit
                      </button>
                      <button
                        data-action="delete"
                        data-index="${index}"
                        style="
                          background-color: #000;
                          color: #fff;
                          padding: 4px 12px;
                          font-size: 12px;
                          text-transform: uppercase;
                          letter-spacing: 0.1em;
                          border: none;
                          cursor: pointer;
                          font-family: inherit;
                          ${state.loading ? 'opacity: 0.5; cursor: not-allowed;' : ''}
                        "
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
        <div style="
          border: 1px solid #e0e0e0;
          background-color: #fff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 64px 0;
        ">
          <p style="color: #666; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">No shots recorded</p>
          <p style="color: #e0e0e0; font-size: 12px;">Click "New Entry" to begin</p>
        </div>
      ` : ''}
      
      <footer style="margin-top: 40px; text-align: center;">
        <p style="color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em;">% Espresso Logger</p>
      </footer>
    </div>
    
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      /* Notes modal styles */
      .notes-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
      }
      
      .notes-modal-content {
        background-color: white;
        width: 80%;
        max-width: 600px;
        border-radius: 4px;
        overflow: hidden;
      }
      
      .notes-modal-header {
        padding: 16px;
        border-bottom: 1px solid #E0E0E0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .notes-modal-header h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 300;
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }
      
      .close-modal {
        font-size: 24px;
        cursor: pointer;
        color: #666;
      }
      
      .notes-modal-body {
        padding: 16px;
        max-height: 60vh;
        overflow-y: auto;
      }
    </style>
  `;
  
  // Add event listeners
  document.getElementById('toggle-form')?.addEventListener('click', toggleForm);
  document.getElementById('export-excel')?.addEventListener('click', exportToExcel);
  
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
            d.style.backgroundColor = '#d.style.backgroundColor = '#000';
          } else {
            d.style.backgroundColor = '#e0e0e0';
          }
        });
      });
    });
    
    document.getElementById('cancel-edit')?.addEventListener('click', cancelEdit);
  }
  
  // Add listeners to notes buttons
  document.querySelectorAll('.notes-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const notes = btn.getAttribute('data-notes');
      viewNotes(notes);
    });
  });
  
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
