import React, { useState, useEffect } from 'react';

// Firebase Configuration
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
  // Minimalist monochrome color palette inspired by % Arabica
  const colors = {
    black: "#000000",
    darkGray: "#333333",
    mediumGray: "#666666",
    lightGray: "#E0E0E0",
    offWhite: "#F5F5F5",
    white: "#FFFFFF",
    accent: "#BBBBBB" // Subtle accent
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

  const getRatingDisplay = (rating) => {
    const ratingNum = parseInt(rating) || 0;
    // Simple visual indicator instead of emojis
    const filled = '●';
    const empty = '○';
    let display = '';
    
    for (let i = 1; i <= 5; i++) {
      display += i <= ratingNum ? filled : empty;
    }
    
    return display;
  };

  return (
    <div style={{ backgroundColor: colors.white, minHeight: '100vh' }} className="espresso-logger">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <header className="mb-12 pt-4">
          <h1 style={{ color: colors.black, letterSpacing: '0.05em' }} className="text-4xl font-light uppercase tracking-widest text-center relative">
            <span className="position-relative">
              % <span style={{ letterSpacing: '0.2em' }}>ESPRESSO</span>
            </span>
          </h1>
          <p style={{ color: colors.mediumGray }} className="text-center text-sm uppercase tracking-widest mt-1">
            Shot Logger
          </p>
        </header>
        
        {loading && (
          <div className="flex justify-center items-center my-8">
            <div style={{ borderTopColor: colors.black }} className="border-2 border-gray-300 h-6 w-6 rounded-full animate-spin"></div>
            <span className="ml-2 text-sm tracking-wide uppercase" style={{ color: colors.mediumGray }}>Syncing</span>
          </div>
        )}
        
        {error && (
          <div style={{ backgroundColor: colors.offWhite, color: colors.black, border: `1px solid ${colors.lightGray}` }} className="p-4 mb-6 text-sm">
            <p>{error}</p>
          </div>
        )}
        
        <div className="flex justify-between items-center mb-8">
          <button 
            onClick={() => {
              setIsFormVisible(!isFormVisible);
              if (!isFormVisible) setError('');
            }} 
            style={{ 
              backgroundColor: isFormVisible ? colors.lightGray : colors.black,
              color: isFormVisible ? colors.black : colors.white
            }} 
            className="px-4 py-2 text-xs uppercase tracking-widest font-light"
          >
            {isFormVisible ? 'Cancel' : 'New Entry'}
          </button>
          
          <div style={{ color: colors.mediumGray }} className="text-xs uppercase tracking-wider">
            {shots.length} {shots.length === 1 ? 'shot' : 'shots'} recorded
          </div>
        </div>
        
        {isFormVisible && (
          <form onSubmit={handleSubmit} style={{ backgroundColor: colors.offWhite }} className="mb-12 p-6">
            <h2 style={{ color: colors.black }} className="text-sm uppercase tracking-widest mb-6 font-light">
              {editIndex !== null ? 'Edit Shot' : 'New Shot'}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label style={{ color: colors.mediumGray }} className="block mb-1 text-xs uppercase tracking-wider">
                  Date
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full p-2 text-sm"
                  style={{ 
                    borderColor: colors.lightGray,
                    backgroundColor: colors.white,
                    color: colors.black
                  }}
                  required
                />
              </div>
              
              <div>
                <label style={{ color: colors.mediumGray }} className="block mb-1 text-xs uppercase tracking-wider">
                  Bean Origin
                </label>
                <input
                  type="text"
                  name="beanName"
                  value={formData.beanName}
                  onChange={handleChange}
                  className="w-full p-2 text-sm"
                  style={{ 
                    borderColor: colors.lightGray,
                    backgroundColor: colors.white,
                    color: colors.black
                  }}
                  placeholder="Ethiopia Yirgacheffe"
                />
              </div>
              
              <div>
                <label style={{ color: colors.mediumGray }} className="block mb-1 text-xs uppercase tracking-wider">
                  Dose (g)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  name="coffeeIn"
                  value={formData.coffeeIn}
                  onChange={handleChange}
                  className="w-full p-2 text-sm"
                  style={{ 
                    borderColor: colors.lightGray,
                    backgroundColor: colors.white,
                    color: colors.black
                  }}
                  placeholder="18.0"
                  required
                />
              </div>
              
              <div>
                <label style={{ color: colors.mediumGray }} className="block mb-1 text-xs uppercase tracking-wider">
                  Yield (g)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  name="espressoOut"
                  value={formData.espressoOut}
                  onChange={handleChange}
                  className="w-full p-2 text-sm"
                  style={{ 
                    borderColor: colors.lightGray,
                    backgroundColor: colors.white,
                    color: colors.black
                  }}
                  placeholder="36.0"
                  required
                />
              </div>
              
              <div>
                <label style={{ color: colors.mediumGray }} className="block mb-1 text-xs uppercase tracking-wider">
                  Grind Setting
                </label>
                <input
                  type="text"
                  name="grindSize"
                  value={formData.grindSize}
                  onChange={handleChange}
                  className="w-full p-2 text-sm"
                  style={{ 
                    borderColor: colors.lightGray,
                    backgroundColor: colors.white,
                    color: colors.black
                  }}
                  placeholder="2.5"
                  required
                />
              </div>
              
              <div>
                <label style={{ color: colors.mediumGray }} className="block mb-1 text-xs uppercase tracking-wider">
                  Time (sec)
                </label>
                <input
                  type="number"
                  min="1"
                  name="extractionTime"
                  value={formData.extractionTime}
                  onChange={handleChange}
                  className="w-full p-2 text-sm"
                  style={{ 
                    borderColor: colors.lightGray,
                    backgroundColor: colors.white,
                    color: colors.black
                  }}
                  placeholder="30"
                  required
                />
              </div>
              
              <div>
                <label style={{ color: colors.mediumGray }} className="block mb-1 text-xs uppercase tracking-wider">
                  Ratio
                </label>
                <input
                  type="text"
                  value={calculateRatio() ? `${calculateRatio()}:1` : ''}
                  className="w-full p-2 text-sm"
                  style={{ 
                    backgroundColor: colors.lightGray,
                    color: colors.mediumGray,
                    border: 'none'
                  }}
                  disabled
                />
              </div>
              
              <div>
                <label style={{ color: colors.mediumGray }} className="block mb-1 text-xs uppercase tracking-wider">
                  Rating
                </label>
                <div className="flex items-center">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    name="rating"
                    value={formData.rating}
                    onChange={handleChange}
                    className="w-full mr-2"
                    style={{
                      accentColor: colors.black,
                    }}
                  />
                  <span style={{ color: colors.black, letterSpacing: '0.3em' }} className="text-lg font-light">
                    {getRatingDisplay(formData.rating)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <label style={{ color: colors.mediumGray }} className="block mb-1 text-xs uppercase tracking-wider">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="w-full p-2 text-sm"
                style={{ 
                  borderColor: colors.lightGray,
                  backgroundColor: colors.white,
                  color: colors.black
                }}
                placeholder="Tasting notes, observations, improvements..."
                rows="3"
              />
            </div>
            
            <div className="flex">
              <button
                type="submit"
                style={{ 
                  backgroundColor: colors.black,
                  color: colors.white
                }}
                className="px-6 py-2 text-xs uppercase tracking-widest font-light mr-3"
                disabled={loading}
              >
                {editIndex !== null ? 'Update' : 'Save'}
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
                  style={{ 
                    backgroundColor: colors.lightGray,
                    color: colors.black
                  }}
                  className="px-6 py-2 text-xs uppercase tracking-widest font-light"
                  disabled={loading}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}
        
        {shots.length > 0 ? (
          <div style={{ borderColor: colors.lightGray }} className="border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: colors.black, color: colors.white }}>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider font-light text-left">Date</th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider font-light text-left">Bean</th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider font-light text-right">In</th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider font-light text-right">Out</th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider font-light text-right">Ratio</th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider font-light text-center">Grind</th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider font-light text-right">Time</th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider font-light text-center">Rating</th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider font-light text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shots.map((shot, index) => (
                    <tr 
                      key={shot.id || index} 
                      style={{ 
                        backgroundColor: index % 2 === 0 ? colors.white : colors.offWhite,
                        borderTop: `1px solid ${colors.lightGray}`
                      }}
                    >
                      <td className="px-4 py-3 text-sm" style={{ color: colors.black }}>{shot.date}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: colors.black }}>{shot.beanName || "—"}</td>
                      <td className="px-4 py-3 text-sm text-right" style={{ color: colors.black }}>{shot.coffeeIn}g</td>
                      <td className="px-4 py-3 text-sm text-right" style={{ color: colors.black }}>{shot.espressoOut}g</td>
                      <td className="px-4 py-3 text-sm text-right" style={{ color: colors.black }}>{getRatioForShot(shot)}</td>
                      <td className="px-4 py-3 text-sm text-center" style={{ color: colors.black }}>{shot.grindSize}</td>
                      <td className="px-4 py-3 text-sm text-right" style={{ color: colors.black }}>{shot.extractionTime}s</td>
                      <td className="px-4 py-3 text-sm text-center" style={{ color: colors.black, letterSpacing: '0.2em' }}>{getRatingDisplay(shot.rating)}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => handleEdit(index)}
                            style={{ backgroundColor: colors.lightGray, color: colors.black }}
                            className="px-3 py-1 text-xs uppercase tracking-wider"
                            disabled={loading}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(index)}
                            style={{ backgroundColor: colors.black, color: colors.white }}
                            className="px-3 py-1 text-xs uppercase tracking-wider"
                            disabled={loading}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : !loading && (
          <div style={{ border: `1px solid ${colors.lightGray}`, backgroundColor: colors.white }} className="flex flex-col items-center justify-center py-16">
            <p style={{ color: colors.mediumGray }} className="text-sm uppercase tracking-widest mb-2">No shots recorded</p>
            <p style={{ color: colors.lightGray }} className="text-xs">Click "New Entry" to begin</p>
          </div>
        )}
        
        <footer className="mt-12 text-center">
          <p style={{ color: colors.mediumGray }} className="text-xs uppercase tracking-wider">
            % Espresso Logger
          </p>
        </footer>
      </div>
    </div>
  );
};

// Render the app
ReactDOM.render(<EspressoLogger />, document.getElementById('root'));
