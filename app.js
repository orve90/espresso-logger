// Firebase Configuration - using compat version for direct browser usage
const firebaseConfig = {
  apiKey: "AIzaSyBPp-evesGdf93i6Ms5770qiL4Smdnxo3c",
  authDomain: "espresso-logger-c6a6d.firebaseapp.com",
  projectId: "espresso-logger-c6a6d",
  storageBucket: "espresso-logger-c6a6d.firebasestorage.app",
  messagingSenderId: "36334040646",
  appId: "1:36334040646:web:e0ac359f4b8f6c1cbe7c47"
};

// Initialize Firebase with compat version
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const EspressoLogger = () => {
  // Coffee-themed color palette
  const colors = {
    darkBrown: "#3E2723", // Dark roast
    mediumBrown: "#5D4037", // Medium roast
    lightBrown: "#8D6E63", // Light roast
    cream: "#D7CCC8", // Cream
    crema: "#FFCC80", // Crema color
    background: "#EFEBE9", // Coffee paper
    accent: "#D4A76A" // Golden crema
  };

  // State management
  const [shots, setShots] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  
  const [formData, setFormData] = React.useState({
    date: new Date().toISOString().split('T')[0],
    coffeeIn: '',
    espressoOut: '',
    grindSize: '',
    extractionTime: '',
    notes: '',
    rating: '3',
    beanName: '',
  });
  
  const [editIndex, setEditIndex] = React.useState(null);
  const [isFormVisible, setIsFormVisible] = React.useState(false);
  const [error, setError] = React.useState('');

  // Load shots from Firestore
  React.useEffect(() => {
    const loadShots = async () => {
      setLoading(true);
      try {
        // Create a real-time listener to keep data in sync across devices
        const unsubscribe = db.collection('shots')
          .orderBy('date', 'desc')
          .onSnapshot((snapshot) => {
            const shotData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setShots(shotData);
            setLoading(false);
          }, (error) => {
            console.error("Error loading shots:", error);
            setError('Could not load shots from the cloud.');
            setLoading(false);
          });
          
        // Clean up listener on unmount
        return () => unsubscribe();
      } catch (error) {
        console.error("Error setting up shots listener:", error);
        setError('Could not connect to the cloud database.');
        setLoading(false);
      }
    };
    
    loadShots();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear errors when user makes changes
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      if (editIndex !== null) {
        // Update existing shot
        const shotId = shots[editIndex].id;
        await db.collection('shots').doc(shotId).update({
          ...formData,
          updatedAt: new Date().toISOString()
        });
        setEditIndex(null);
      } else {
        // Add new shot
        await db.collection('shots').add({
          ...formData,
          createdAt: new Date().toISOString()
        });
      }
      
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        coffeeIn: '',
        espressoOut: '',
        grindSize: '',
        extractionTime: '',
        notes: '',
        rating: '3',
        beanName: '',
      });
      
      setIsFormVisible(false);
    } catch (error) {
      console.error("Error submitting form:", error);
      setError('An error occurred while saving to the cloud. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (index) => {
    try {
      setFormData(shots[index]);
      setEditIndex(index);
      setIsFormVisible(true);
      setError('');
    } catch (error) {
      console.error("Error editing shot:", error);
      setError('Could not edit this entry. Please try again.');
    }
  };

  const handleDelete = async (index) => {
    try {
      if (window.confirm('Are you sure you want to delete this shot?')) {
        setLoading(true);
        const shotId = shots[index].id;
        await db.collection('shots').doc(shotId).delete();
      }
    } catch (error) {
      console.error("Error deleting shot:", error);
      setError('Could not delete this entry from the cloud. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateRatio = () => {
    try {
      if (formData.coffeeIn && formData.espressoOut) {
        const coffeeInNum = parseFloat(formData.coffeeIn);
        // Prevent division by zero
        if (coffeeInNum <= 0) return '';
        return (parseFloat(formData.espressoOut) / coffeeInNum).toFixed(1);
      }
      return '';
    } catch (error) {
      console.error("Error calculating ratio:", error);
      return '';
    }
  };

  const getRatioForShot = (shot) => {
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
  };

  const getRatingEmoji = (rating) => {
    const ratingNum = parseInt(rating) || 0;
    switch(ratingNum) {
      case 1: return '😖';
      case 2: return '😕';
      case 3: return '😐';
      case 4: return '😊';
      case 5: return '😍';
      default: return '🤔';
    }
  };

  return (
    <div style={{ backgroundColor: colors.background }} className="espresso-app">
      <div className="app-container">
        <h1 className="app-title" style={{ color: colors.darkBrown }}>
          ☕ Espresso Shot Logger ☕
        </h1>
        
        {loading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <p>Syncing your shots...</p>
          </div>
        )}
        
        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}
        
        <div className="button-row">
          <button 
            onClick={() => {
              setIsFormVisible(!isFormVisible);
              if (!isFormVisible) setError('');
            }} 
            className="new-shot-btn"
            style={{ backgroundColor: colors.mediumBrown }}
          >
            {isFormVisible ? 'Cancel' : '➕ New Shot'}
          </button>
          
          <div className="shot-counter" style={{ color: colors.darkBrown, backgroundColor: colors.cream }}>
            {shots.length} {shots.length === 1 ? 'shot' : 'shots'} pulled 🎯
          </div>
        </div>
        
        {isFormVisible && (
          <form onSubmit={handleSubmit} className="shot-form" style={{ backgroundColor: colors.cream }}>
            <h2 className="form-title" style={{ color: colors.darkBrown }}>
              {editIndex !== null ? '✏️ Edit Shot' : '➕ New Shot'}
            </h2>
            
            <div className="form-grid">
              <div className="form-group">
                <label>📅 Date</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="form-input"
                  style={{ borderColor: colors.lightBrown }}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>🫘 Bean Name</label>
                <input
                  type="text"
                  name="beanName"
                  value={formData.beanName}
                  onChange={handleChange}
                  className="form-input"
                  style={{ borderColor: colors.lightBrown }}
                  placeholder="Ethiopia Yirgacheffe"
                />
              </div>
              
              <div className="form-group">
                <label>⚖️ Coffee In (g)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  name="coffeeIn"
                  value={formData.coffeeIn}
                  onChange={handleChange}
                  className="form-input"
                  style={{ borderColor: colors.lightBrown }}
                  placeholder="18.0"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>🥤 Espresso Out (g)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  name="espressoOut"
                  value={formData.espressoOut}
                  onChange={handleChange}
                  className="form-input"
                  style={{ borderColor: colors.lightBrown }}
                  placeholder="36.0"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>🔄 Grind Size</label>
                <input
                  type="text"
                  name="grindSize"
                  value={formData.grindSize}
                  onChange={handleChange}
                  className="form-input"
                  style={{ borderColor: colors.lightBrown }}
                  placeholder="2.5"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>⏱️ Extraction Time (sec)</label>
                <input
                  type="number"
                  min="1"
                  name="extractionTime"
                  value={formData.extractionTime}
                  onChange={handleChange}
                  className="form-input"
                  style={{ borderColor: colors.lightBrown }}
                  placeholder="30"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>🧮 Ratio (out:in)</label>
                <input
                  type="text"
                  value={calculateRatio() ? `${calculateRatio()}:1` : ''}
                  className="form-input"
                  style={{ backgroundColor: colors.background, borderColor: colors.lightBrown }}
                  disabled
                />
              </div>
              
              <div className="form-group">
                <label>⭐ Rating</label>
                <div className="rating-container">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    name="rating"
                    value={formData.rating}
                    onChange={handleChange}
                    className="rating-slider"
                  />
                  <span className="rating-emoji">{getRatingEmoji(formData.rating)}</span>
                </div>
              </div>
            </div>
            
            <div className="form-group">
              <label>📝 Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="form-textarea"
                style={{ borderColor: colors.lightBrown }}
                placeholder="Taste notes, adjustments needed, etc."
                rows="3"
              />
            </div>
            
            <div className="form-actions">
              <button
                type="submit"
                className="save-btn"
                style={{ backgroundColor: colors.accent }}
                disabled={loading}
              >
                {editIndex !== null ? '✅ Update Shot' : '✅ Save Shot'}
              </button>
              
              {editIndex !== null && (
                <button
                  type="button"
                  onClick={() => {
                    setEditIndex(null);
                    setIsFormVisible(false);
                    setFormData({
                      date: new Date().toISOString().split('T')[0],
                      coffeeIn: '',
                      espressoOut: '',
                      grindSize: '',
                      extractionTime: '',
                      notes: '',
                      rating: '3',
                      beanName: '',
                    });
                    setError('');
                  }}
                  className="cancel-btn"
                  disabled={loading}
                >
                  ❌ Cancel
                </button>
              )}
            </div>
          </form>
        )}
        
        {shots.length > 0 ? (
          <div className="table-container">
            <table className="shots-table">
              <thead>
                <tr style={{ backgroundColor: colors.darkBrown, color: 'white' }}>
                  <th>📅 Date</th>
                  <th>🫘 Bean</th>
                  <th>⚖️ In</th>
                  <th>🥤 Out</th>
                  <th>🧮 Ratio</th>
                  <th>🔄 Grind</th>
                  <th>⏱️ Time</th>
                  <th>⭐ Rating</th>
                  <th>🔧 Actions</th>
                </tr>
              </thead>
              <tbody>
                {shots.map((shot, index) => {
                  // Alternate row colors
                  const rowColor = index % 2 === 0 ? 'white' : colors.background;
                  
                  return (
                    <tr key={shot.id || index} style={{ backgroundColor: rowColor }} className="table-row">
                      <td>{shot.date}</td>
                      <td>{shot.beanName || "—"}</td>
                      <td>{shot.coffeeIn}g</td>
                      <td>{shot.espressoOut}g</td>
                      <td>{getRatioForShot(shot)}</td>
                      <td>{shot.grindSize}</td>
                      <td>{shot.extractionTime}s</td>
                      <td className="rating-cell">{getRatingEmoji(shot.rating)}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => handleEdit(index)}
                            className="edit-btn"
                            style={{ backgroundColor: colors.accent }}
                            disabled={loading}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDelete(index)}
                            className="delete-btn"
                            disabled={loading}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : !loading && (
          <div className="empty-state">
            <p className="empty-title" style={{ color: colors.mediumBrown }}>No shots logged yet ☕</p>
            <p className="empty-subtitle" style={{ color: colors.lightBrown }}>Click 'New Shot' to start tracking your espresso journey!</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Render the app
ReactDOM.render(<EspressoLogger />, document.getElementById('root'));
