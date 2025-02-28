// Firebase Configuration - BROWSER VERSION
const firebaseConfig = {
  apiKey: "AIzaSyBPp-evesGdf93i6Ms5770qiL4Smdnxo3c",
  authDomain: "espresso-logger-c6a6d.firebaseapp.com",
  projectId: "espresso-logger-c6a6d",
  storageBucket: "espresso-logger-c6a6d.firebasestorage.app",
  messagingSenderId: "36334040646",
  appId: "1:36334040646:web:e0ac359f4b8f6c1cbe7c47"
};

// Initialize Firebase (browser version)
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
    <div style={{ backgroundColor: colors.white, minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <header style={{ marginBottom: '3rem', paddingTop: '1rem' }}>
          <h1 style={{ 
            color: colors.black, 
            letterSpacing: '0.05em',
            fontSize: '2rem',
            fontWeight: 300,
            textTransform: 'uppercase',
            textAlign: 'center'
          }}>
            % <span style={{ letterSpacing: '0.2em' }}>ESPRESSO</span>
          </h1>
          <p style={{ 
            color: colors.mediumGray, 
            textAlign: 'center',
            fontSize: '0.875rem',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            marginTop: '0.25rem'
          }}>
            Shot Logger
          </p>
        </header>
        
        {loading && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            margin: '2rem 0'
          }}>
            <div style={{ 
              borderTop: `2px solid ${colors.black}`,
              borderRight: `2px solid ${colors.lightGray}`,
              borderBottom: `2px solid ${colors.lightGray}`,
              borderLeft: `2px solid ${colors.lightGray}`,
              borderRadius: '50%',
              width: '1.5rem',
              height: '1.5rem',
              animation: 'spin 1s linear infinite'
            }}></div>
            <span style={{ 
              marginLeft: '0.5rem',
              fontSize: '0.875rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: colors.mediumGray
            }}>Syncing</span>
          </div>
        )}
        
        {error && (
          <div style={{ 
            backgroundColor: colors.offWhite, 
            color: colors.black, 
            border: `1px solid ${colors.lightGray}`,
            padding: '1rem',
            marginBottom: '1.5rem',
            fontSize: '0.875rem'
          }}>
            <p>{error}</p>
          </div>
        )}
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <button 
            onClick={() => {
              setIsFormVisible(!isFormVisible);
              if (!isFormVisible) setError('');
            }} 
            style={{ 
              backgroundColor: isFormVisible ? colors.lightGray : colors.black,
              color: isFormVisible ? colors.black : colors.white,
              padding: '0.5rem 1rem',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontWeight: 300,
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {isFormVisible ? 'Cancel' : 'New Entry'}
          </button>
          
          <div style={{ 
            color: colors.mediumGray,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
          }}>
            {shots.length} {shots.length === 1 ? 'shot' : 'shots'} recorded
          </div>
        </div>
        
        {isFormVisible && (
          <form 
            onSubmit={handleSubmit} 
            style={{ 
              backgroundColor: colors.offWhite,
              marginBottom: '3rem',
              padding: '1.5rem'
            }}
          >
            <h2 style={{ 
              color: colors.black,
              fontSize: '0.875rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '1.5rem',
              fontWeight: 300
            }}>
              {editIndex !== null ? 'Edit Shot' : 'New Shot'}
            </h2>
            
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <div>
                <label style={{ 
                  color: colors.mediumGray,
                  display: 'block',
                  marginBottom: '0.25rem',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}>
                  Date
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  style={{ 
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '0.875rem',
                    borderColor: colors.lightGray,
                    backgroundColor: colors.white,
                    color: colors.black
                  }}
                  required
                />
              </div>
              
              <div>
                <label style={{ 
                  color: colors.mediumGray,
                  display: 'block',
                  marginBottom: '0.25rem',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}>
                  Bean Origin
                </label>
                <input
                  type="text"
                  name="beanName"
                  value={formData.beanName}
                  onChange={handleChange}
                  style={{ 
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '0.875rem',
                    borderColor: colors.lightGray,
                    backgroundColor: colors.white,
                    color: colors.black
                  }}
                  placeholder="Ethiopia Yirgacheffe"
                />
              </div>
              
              <div>
                <label style={{ 
                  color: colors.mediumGray,
                  display: 'block',
                  marginBottom: '0.25rem',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}>
                  Dose (g)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  name="coffeeIn"
                  value={formData.coffeeIn}
                  onChange={handleChange}
                  style={{ 
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '0.875rem',
                    borderColor: colors.lightGray,
                    backgroundColor: colors.white,
                    color: colors.black
                  }}
                  placeholder="18.0"
                  required
                />
              </div>
              
              <div>
                <label style={{ 
                  color: colors.mediumGray,
                  display: 'block',
                  marginBottom: '0.25rem',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}>
                  Yield (g)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  name="espressoOut"
                  value={formData.espressoOut}
                  onChange={handleChange}
                  style={{ 
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '0.875rem',
                    borderColor: colors.lightGray,
                    backgroundColor: colors.white,
                    color: colors.black
                  }}
                  placeholder="36.0"
                  required
                />
              </div>
              
              <div>
                <label style={{ 
                  color: colors.mediumGray,
                  display: 'block',
                  marginBottom: '0.25rem',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}>
                  Grind Setting
                </label>
                <input
                  type="text"
                  name="grindSize"
                  value={formData.grindSize}
                  onChange={handleChange}
                  style={{ 
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '0.875rem',
                    borderColor: colors.lightGray,
                    backgroundColor: colors.white,
                    color: colors.black
                  }}
                  placeholder="2.5"
                  required
                />
              </div>
              
              <div>
                <label style={{ 
                  color: colors.mediumGray,
                  display: 'block',
                  marginBottom: '0.25rem',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}>
                  Time (sec)
                </label>
                <input
                  type="number"
                  min="1"
                  name="extractionTime"
                  value={formData.extractionTime}
                  onChange={handleChange}
                  style={{ 
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '0.875rem',
                    borderColor: colors.lightGray,
                    backgroundColor: colors.white,
                    color: colors.black
                  }}
                  placeholder="30"
                  required
                />
              </div>
              
              <div>
                <label style={{ 
                  color: colors.mediumGray,
                  display: 'block',
                  marginBottom: '0.25rem',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}>
                  Ratio
                </label>
                <input
                  type="text"
                  value={calculateRatio() ? `${calculateRatio()}:1` : ''}
                  style={{ 
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '0.875rem',
                    backgroundColor: colors.lightGray,
                    color: colors.mediumGray,
                    border: 'none'
                  }}
                  disabled
                />
              </div>
              
              <div>
                <label style={{ 
                  color: colors.mediumGray,
                  display: 'block',
                  marginBottom: '0.25rem',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}>
                  Rating
                </label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    name="rating"
                    value={formData.rating}
                    onChange={handleChange}
                    style={{ width: '100%', marginRight: '0.5rem' }}
                  />
                  <span style={{ 
                    color: colors.black, 
                    letterSpacing: '0.3em',
                    fontSize: '1.125rem',
                    fontWeight: 300
                  }}>
                    {getRatingDisplay(formData.rating)}
                  </span>
                </div>
              </div>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                color: colors.mediumGray,
                display: 'block',
                marginBottom: '0.25rem',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
              }}>
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                style={{ 
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '0.875rem',
                  borderColor: colors.lightGray,
                  backgroundColor: colors.white,
                  color: colors.black
                }}
                placeholder="Tasting notes, observations, improvements..."
                rows="3"
              />
            </div>
            
            <div style={{ display: 'flex' }}>
              <button
                type="submit"
                style={{ 
                  backgroundColor: colors.black,
                  color: colors.white,
                  padding: '0.5rem 1.5rem',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  fontWeight: 300,
                  marginRight: '0.75rem',
                  border: 'none',
                  cursor: 'pointer'
                }}
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
                    color: colors.black,
                    padding: '0.5rem 1.5rem',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    fontWeight: 300,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  disabled={loading}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}
        
        {shots.length > 0 ? (
          <div style={{ border: `1px solid ${colors.lightGray}` }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: colors.black, color: colors.white }}>
                    <th style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      fontWeight: 300,
                      textAlign: 'left'
                    }}>Date</th>
                    <th style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      fontWeight: 300,
                      textAlign: 'left'
                    }}>Bean</th>
                    <th style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      fontWeight: 300,
                      textAlign: 'right'
                    }}>In</th>
                    <th style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      fontWeight: 300,
                      textAlign: 'right'
                    }}>Out</th>
                    <th style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      fontWeight: 300,
                      textAlign: 'right'
                    }}>Ratio</th>
                    <th style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      fontWeight: 300,
                      textAlign: 'center'
                    }}>Grind</th>
                    <th style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      fontWeight: 300,
                      textAlign: 'right'
                    }}>Time</th>
                    <th style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      fontWeight: 300,
                      textAlign: 'center'
                    }}>Rating</th>
                    <th style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      fontWeight: 300,
                      textAlign: 'center'
                    }}>Actions</th>
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
                      <td style={{
                        padding: '0.75rem 1rem',
                        fontSize: '0.875rem',
                        color: colors.black
                      }}>{shot.date}</td>
                      <td style={{
                        padding: '0.75rem 1rem',
                        fontSize: '0.875rem',
                        color: colors.black
                      }}>{shot.beanName || "—"}</td>
                      <td style={{
                        padding: '0.75rem 1rem',
                        fontSize: '0.875rem',
                        color: colors.black,
                        textAlign: 'right'
                      }}>{shot.coffeeIn}g</td>
                      <td style={{
                        padding: '0.75rem 1rem',
                        fontSize: '0.875rem',
                        color: colors.black,
                        textAlign: 'right'
                      }}>{shot.espressoOut}g</td>
                      <td style={{
                        padding: '0.75rem 1rem',
                        fontSize: '0.875rem',
                        color: colors.black,
                        textAlign: 'right'
                      }}>{getRatioForShot(shot)}</td>
                      <td style={{
                        padding: '0.75rem 1rem',
                        fontSize: '0.875rem',
                        color: colors.black,
                        textAlign: 'center'
                      }}>{shot.grindSize}</td>
                      <td style={{
                        padding: '0.75rem 1rem',
                        fontSize: '0.875rem',
                        color: colors.black,
                        textAlign: 'right'
                      }}>{shot.extractionTime}s</td>
                      <td style={{
                        padding: '0.75rem 1rem',
                        fontSize: '0.875rem',
                        color: colors.black,
                        textAlign: 'center',
                        letterSpacing: '0.2em'
                      }}>{getRatingDisplay(shot.rating)}</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleEdit(index)}
                            style={{ 
                              backgroundColor: colors.lightGray, 
                              color: colors.black,
                              padding: '0.25rem 0.75rem',
                              fontSize: '0.75rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                            disabled={loading}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(index)}
                            style={{ 
                              backgroundColor: colors.black, 
                              color: colors.white,
                              padding: '0.25rem 0.75rem',
                              fontSize: '0.75rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                              border: 'none',
                              cursor: 'pointer'
                            }}
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
          <div style={{ 
            border: `1px solid ${colors.lightGray}`, 
            backgroundColor: colors.white,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 0'
          }}>
            <p style={{ 
              color: colors.mediumGray,
              fontSize: '0.875rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '0.5rem'
            }}>No shots recorded</p>
            <p style={{ 
              color: colors.lightGray,
              fontSize: '0.75rem'
            }}>Click "New Entry" to begin</p>
          </div>
        )}
        
        <footer style={{ marginTop: '3rem', textAlign: 'center' }}>
          <p style={{ 
            color: colors.mediumGray,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
          }}>
            % Espresso Logger
          </p>
        </footer>
      </div>
    </div>
  );
};

// Render the app
ReactDOM.render(<EspressoLogger />, document.getElementById('root'));
