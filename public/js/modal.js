//for all modals
document.querySelectorAll('.modal').forEach(modal => {
    // Get the <span> element that closes the modal
    const closeSpan = modal.querySelector('.close')

    // Close modal when x icon/span is clicked
    closeSpan.addEventListener('click', () => {
        closeModal(modal)
    })
    // Close modal when clicking on the modal background (not the modal content)
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal(modal)
        }
    })
    // Close modal when pressing the "Escape" key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeModal(modal)
        }
    })
})

function closeModal(modal) {
    modal.style.display = 'none'
}

//for the modal in index.html
const updateOK = document.getElementById('updateOK')
if(updateOK) {
    updateOK.addEventListener('click', () => {
        window.close() //only works if window was opened through javascript
        closeModal(document.getElementById('updateModal'))
    })
}
const updateCancel = document.getElementById('updateCancel')
if(updateCancel) {
    updateCancel.addEventListener('click', () => {
        closeModal(document.getElementById('updateModal'))
    })
}