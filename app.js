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
  padding: 1rem;
  border-bottom: 1px solid #E0E0E0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.notes-modal-header h2 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 300;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.close-modal {
  font-size: 1.5rem;
  cursor: pointer;
  color: #666666;
}

.notes-modal-body {
  padding: 1rem;
  max-height: 60vh;
  overflow-y: auto;
}

.notes-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #000;
  text-decoration: underline;
  padding: 0;
  font-size: 0.875rem;
}

.notes-btn:hover {
  opacity: 0.7;
}
