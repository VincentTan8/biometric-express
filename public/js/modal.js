//Modal that appears when update is finished
const modal = document.getElementById('updateModal')
// Get the <span> element that closes the modal
const closeSpan = document.querySelector('.close')

// Close modal when x icon/span is clicked
closeSpan.addEventListener('click', () => {
    closeModal()
})
// Close modal when clicking on the modal background (not the modal content)
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        closeModal()
    }
})
// Close modal when pressing the "Escape" key
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeModal()
    }
})

function openModal() {
    modal.style.display = 'block'
}

function closeModal() {
    modal.style.display = 'none'
}

function closeTab() {
    window.close() //only works if window was opened through javascript
}