// Quick Notes — local & private
(function(){
  const qs = (sel, el=document) => el.querySelector(sel);
  const qsa = (sel, el=document) => [...el.querySelectorAll(sel)];

  const el = {
    app: qs('#app'),
    search: qs('#search'),
    filterCategory: qs('#filterCategory'),
    filterFolder: qs('#filterFolder'),
    sortBy: qs('#sortBy'),
    darkToggle: qs('#darkToggle'),
    themeColor: qs('#themeColor'),
    manageFolders: qs('#manageFolders'),
    clearAll: qs('#clearAll'),
    form: qs('#noteForm'),
    title: qs('#title'),
    category: qs('#category'),
    folder: qs('#folder'),
    content: qs('#content'),
    saveBtn: qs('#saveNote'),
    resetBtn: qs('#resetForm'),
    grid: qs('#notesGrid'),
    folderNav: qs('#folderNav'),
    folderList: qs('#folderList'),
    empty: qs('#emptyState'),
    tmpl: qs('#noteCardTemplate'),
    folderNavTmpl: qs('#folderNavItemTemplate'),
    
    // Modal elements
    noteModal: qs('#noteModal'),
    modalCloseBtn: qs('.modal-close-btn', qs('#noteModal')),
    modalNoteTitle: qs('#modalNoteTitle'),
    modalNoteCategory: qs('#modalNoteCategory'),
    modalNoteFolder: qs('#modalNoteFolder'),
    modalNoteContent: qs('#modalNoteContent'),
    modalNoteCreated: qs('#modalNoteCreated'),
    modalNoteUpdated: qs('#modalNoteUpdated'),

    // Save Note Modal
    saveNoteModal: qs('#saveNoteModal'),
    savedNoteTitle: qs('#savedNoteTitle'),
    savedNoteCategory: qs('#savedNoteCategory'),
    savedNoteFolder: qs('#savedNoteFolder'),
    savedNoteContent: qs('#savedNoteContent'),
    viewNewNote: qs('#viewNewNote'),
    closeSaveModal: qs('#closeSaveModal'),

    // Folder Management Modal
    folderModal: qs('#folderModal'),
    folderForm: qs('#folderForm'),
    folderName: qs('#folderName'),
    folderItems: qs('#folderItems'),

    // Move Note Modal
    moveNoteModal: qs('#moveNoteModal'),
    moveFolderSelect: qs('#moveFolderSelect'),
    confirmMove: qs('#confirmMove'),
    cancelMove: qs('#cancelMove')
  };

  // --- State & Storage
  const LS_KEYS = {
    NOTES: 'qn_notes',
    FOLDERS: 'qn_folders',
    THEME: 'qn_theme',
    COLOR: 'qn_color',
  };

  let state = {
    notes: load(LS_KEYS.NOTES, []),
    folders: load(LS_KEYS.FOLDERS, []),
    editId: null,
    moveNoteId: null,
    theme: load(LS_KEYS.THEME, { dark: true }),
    color: load(LS_KEYS.COLOR, '#7c3aed'),
    currentFolderFilter: ''
  };

  // Apply persisted theme/color
  document.documentElement.setAttribute('data-theme', state.theme.dark ? 'dark' : 'light');
  el.darkToggle.checked = state.theme.dark;
  setPrimaryColor(state.color);
  el.themeColor.value = state.color;

  // Utilities
  function save(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
  function load(key, fallback){ try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch(e){ return fallback; } }
  const nowISO = () => new Date().toISOString();
  const fmt = (iso) => new Date(iso).toLocaleString();

  // Initialize folders if empty
  if (!state.folders.length) {
    state.folders = [
      { id: crypto.randomUUID(), name: 'Work', color: '#3b82f6' },
      { id: crypto.randomUUID(), name: 'Personal', color: '#ec4899' },
      { id: crypto.randomUUID(), name: 'Ideas', color: '#f59e0b' }
    ];
    save(LS_KEYS.FOLDERS, state.folders);
  }

  // Populate folder dropdowns
  function populateFolderDropdowns() {
    const folderDropdowns = [el.folder, el.filterFolder, el.moveFolderSelect];
    folderDropdowns.forEach(dropdown => {
      if (!dropdown) return;
      const currentValue = dropdown.value;
      dropdown.innerHTML = '<option value="">No folder</option>';
      state.folders.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder.id;
        option.textContent = folder.name;
        dropdown.appendChild(option);
      });
      if (currentValue && state.folders.some(f => f.id === currentValue)) {
        dropdown.value = currentValue;
      } else {
        dropdown.value = ''; // Reset if current folder no longer exists
      }
    });
  }

  // Create/Update note
  el.form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const title = el.title.value.trim();
    const content = el.content.value.trim();
    const category = el.category.value;
    const folder = el.folder.value;

    if(!title || !content || !category){ return; }

    let savedNote;
    if(state.editId){
      const n = state.notes.find(n => n.id === state.editId);
      if(n){
        n.title = title; n.content = content; n.category = category; n.folder = folder;
        n.updatedAt = nowISO();
        savedNote = n;
      }
      state.editId = null;
      el.saveBtn.textContent = 'Save Note';
    } else {
      const note = {
        id: crypto.randomUUID(),
        title, content, category, folder,
        pinned: false,
        createdAt: nowISO(),
        updatedAt: nowISO()
      };
      state.notes.unshift(note);
      savedNote = note;
    }

    save(LS_KEYS.NOTES, state.notes);
    el.form.reset();
    render();
    
    // Show save confirmation modal
    showSaveNoteModal(savedNote);
  });

  // Show save note confirmation modal
  function showSaveNoteModal(note) {
    el.savedNoteTitle.textContent = note.title;
    el.savedNoteCategory.textContent = note.category;
    el.savedNoteFolder.textContent = note.folder ? getFolderName(note.folder) : 'No folder';
    el.savedNoteContent.textContent = note.content;
    el.savedNoteModal.hidden = false;
  }

  // Get folder name by ID
  function getFolderName(folderId) {
    const folder = state.folders.find(f => f.id === folderId);
    return folder ? folder.name : folderId;
  }

  // View new note from save modal
  el.viewNewNote.addEventListener('click', () => {
    if (state.notes.length > 0) {
      openNoteModal(state.notes[0]); // Show the first note (most recent)
    }
    el.savedNoteModal.hidden = true;
  });

  // Close save modal
  el.closeSaveModal.addEventListener('click', () => {
    el.savedNoteModal.hidden = true;
  });

  el.resetBtn.addEventListener('click', ()=>{
    state.editId = null;
    el.saveBtn.textContent = 'Save Note';
    el.form.reset();
  });

  // Search / Filter / Sort
  ['input','change'].forEach(ev => {
    el.search.addEventListener(ev, render);
    el.filterCategory.addEventListener(ev, render);
    el.filterFolder.addEventListener(ev, () => {
      state.currentFolderFilter = el.filterFolder.value;
      render();
    });
    el.sortBy.addEventListener(ev, render);
  });

  // Clear all
  el.clearAll.addEventListener('click', ()=>{
    if(confirm('Delete ALL notes? This cannot be undone.')){
      state.notes = [];
      save(LS_KEYS.NOTES, state.notes);
      render();
    }
  });

  // Theme toggle
  el.darkToggle.addEventListener('change', ()=>{
    state.theme.dark = el.darkToggle.checked;
    document.documentElement.setAttribute('data-theme', state.theme.dark ? 'dark' : 'light');
    save(LS_KEYS.THEME, state.theme);
  });

  // Theme color
  el.themeColor.addEventListener('input', ()=>{
    const c = el.themeColor.value;
    state.color = c;
    setPrimaryColor(c);
    save(LS_KEYS.COLOR, c);
  });

  function setPrimaryColor(color){
    document.documentElement.style.setProperty('--primary', color);
  }

  // Folder management
  el.manageFolders.addEventListener('click', () => {
    showFolderModal();
  });

  function showFolderModal() {
    renderFolderItems();
    el.folderModal.hidden = false;
  }

  el.folderForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = el.folderName.value.trim();
    if (!name) return;
    
    // Check for duplicate folder name
    if (state.folders.some(f => f.name.toLowerCase() === name.toLowerCase())) {
      alert('A folder with this name already exists!');
      return;
    }

    const folder = {
      id: crypto.randomUUID(),
      name: name,
      color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`
    };
    
    state.folders.push(folder);
    save(LS_KEYS.FOLDERS, state.folders);
    el.folderName.value = '';
    populateFolderDropdowns();
    renderFolderItems();
    renderFolderNav();
  });

  function renderFolderItems() {
    el.folderItems.innerHTML = '';
    state.folders.forEach(folder => {
      const div = document.createElement('div');
      div.className = 'folder-item';
      div.dataset.id = folder.id;

      div.innerHTML = `
        <span class="folder-color" style="background: ${folder.color}"></span>
        <span class="folder-item-name">${folder.name}</span>
        <input type="text" class="rename-input" value="${folder.name}" maxlength="30" />
        <div class="folder-actions">
          <button class="btn tiny ghost rename-folder" title="Rename Folder" data-id="${folder.id}">Rename</button>
          <button class="btn tiny danger delete-folder" title="Delete Folder" data-id="${folder.id}">Delete</button>
        </div>
      `;
      el.folderItems.appendChild(div);
    });

    // Add delete folder event listeners
    qsa('.delete-folder', el.folderItems).forEach(btn => {
      btn.addEventListener('click', () => {
        const folderId = btn.dataset.id;
        const folderName = getFolderName(folderId);
        if (confirm(`Delete folder "${folderName}"? Notes in this folder will be moved to "No folder".`)) {
          // Move notes from this folder to no folder
          state.notes.forEach(note => {
            if (note.folder === folderId) {
              note.folder = '';
              note.updatedAt = nowISO();
            }
          });
          
          // Remove folder
          state.folders = state.folders.filter(f => f.id !== folderId);
          save(LS_KEYS.FOLDERS, state.folders);
          save(LS_KEYS.NOTES, state.notes);
          populateFolderDropdowns();
          renderFolderItems();
          renderFolderNav();
          render(); // Re-render notes grid to reflect folder changes
        }
      });
    });

    // Add rename folder event listeners
    qsa('.rename-folder', el.folderItems).forEach(btn => {
      btn.addEventListener('click', (e) => {
        const folderId = btn.dataset.id;
        const folderItem = e.target.closest('.folder-item');
        const folderNameSpan = qs('.folder-item-name', folderItem);
        const renameInput = qs('.rename-input', folderItem);
        const renameBtn = qs('.rename-folder', folderItem);

        // Show input, hide span
        folderNameSpan.style.display = 'none';
        renameInput.style.display = 'block';
        renameInput.focus();
        renameInput.select();

        // Handle rename completion
        const completeRename = () => {
          const newName = renameInput.value.trim();
          const oldName = folderNameSpan.textContent;
          
          if (newName && newName !== oldName) {
            // Check for duplicate name
            if (state.folders.some(f => f.name.toLowerCase() === newName.toLowerCase() && f.id !== folderId)) {
              alert('A folder with this name already exists!');
              renameInput.value = oldName;
              renameInput.style.display = 'none';
              folderNameSpan.style.display = 'block';
              return;
            }

            // Update folder name
            const folderToRename = state.folders.find(f => f.id === folderId);
            if (folderToRename) {
              folderToRename.name = newName;
              save(LS_KEYS.FOLDERS, state.folders);
              populateFolderDropdowns();
              renderFolderItems();
              renderFolderNav();
              render();
            }
          } else {
            // Revert if name is empty or unchanged
            renameInput.value = oldName;
          }
          
          // Hide input, show span
          renameInput.style.display = 'none';
          folderNameSpan.style.display = 'block';
        };

        // Handle Enter key and blur
        renameInput.onblur = completeRename;
        renameInput.onkeydown = (e) => {
          if (e.key === 'Enter') {
            completeRename();
          } else if (e.key === 'Escape') {
            renameInput.value = folderNameSpan.textContent;
            renameInput.style.display = 'none';
            folderNameSpan.style.display = 'block';
          }
        };
      });
    });
  }

  // Close modals
  function setupModalClose(modal, closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.hidden = true;
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.hidden = true;
      }
    });
  }

  setupModalClose(el.noteModal, qs('.modal-close-btn', el.noteModal));
  setupModalClose(el.saveNoteModal, qs('.modal-close-btn', el.saveNoteModal));
  setupModalClose(el.folderModal, qs('.modal-close-btn', el.folderModal));
  setupModalClose(el.moveNoteModal, qs('.modal-close-btn', el.moveNoteModal));

  // Note actions (event delegation)
  el.grid.addEventListener('click', (e)=>{
    const card = e.target.closest('.note');
    if(!card) return;
    const id = card.dataset.id;
    const note = state.notes.find(n => n.id === id);
    if(!note) return;

    if(e.target.matches('.del-btn')){
      if(confirm('Delete this note?')){
        state.notes = state.notes.filter(n => n.id !== id);
        save(LS_KEYS.NOTES, state.notes);
        render();
      }
    } else if(e.target.matches('.edit-btn')){
      // Load into form
      el.title.value = note.title;
      el.content.value = note.content;
      el.category.value = note.category;
      el.folder.value = note.folder || '';
      el.saveBtn.textContent = 'Update Note';
      state.editId = id;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if(e.target.matches('.pin-btn')){
      note.pinned = !note.pinned;
      note.updatedAt = nowISO();
      save(LS_KEYS.NOTES, state.notes);
      render();
    } else if (e.target.matches('.move-btn')) {
      state.moveNoteId = id;
      el.moveFolderSelect.value = note.folder || '';
      el.moveNoteModal.hidden = false;
    } else if (e.target.closest('.note-body') || e.target.matches('.note-title')) {
      // Open full view modal if note body or title is clicked
      openNoteModal(note);
    }
  });

  // Move note to folder
  el.confirmMove.addEventListener('click', () => {
    if (state.moveNoteId) {
      const note = state.notes.find(n => n.id === state.moveNoteId);
      if (note) {
        note.folder = el.moveFolderSelect.value;
        note.updatedAt = nowISO();
        save(LS_KEYS.NOTES, state.notes);
        render();
      }
      state.moveNoteId = null;
      el.moveNoteModal.hidden = true;
    }
  });

  el.cancelMove.addEventListener('click', () => {
    state.moveNoteId = null;
    el.moveNoteModal.hidden = true;
  });

  // Folder navigation
  function renderFolderNav() {
    el.folderList.innerHTML = '';
    
    // Add "All" button
    const allBtn = document.createElement('button');
    allBtn.className = 'folder-nav-item';
    allBtn.dataset.id = '';
    allBtn.innerHTML = `
      <span class="folder-name">All Notes</span>
      <span class="note-count">${state.notes.length}</span>
    `;
    allBtn.addEventListener('click', () => {
      state.currentFolderFilter = '';
      el.filterFolder.value = '';
      render();
    });
    el.folderList.appendChild(allBtn);

    // Add folder buttons
    state.folders.forEach(folder => {
      const noteCount = state.notes.filter(n => n.folder === folder.id).length;
      
      const btn = document.createElement('button');
      btn.className = 'folder-nav-item';
      btn.dataset.id = folder.id;
      btn.innerHTML = `
        <span class="folder-color" style="background: ${folder.color}"></span>
        <span class="folder-name">${folder.name}</span>
        <span class="note-count">${noteCount}</span>
      `;
      btn.addEventListener('click', () => {
        state.currentFolderFilter = folder.id;
        el.filterFolder.value = folder.id;
        render();
      });
      el.folderList.appendChild(btn);
    });
  }

  function openNoteModal(note) {
    el.modalNoteTitle.textContent = note.title;
    el.modalNoteCategory.textContent = note.category;
    el.modalNoteFolder.textContent = note.folder ? getFolderName(note.folder) : 'No folder';
    // Color accent by category (soft hue map) for modal chip
    const hue = {
      'Work': 200, 'Personal': 330, 'Ideas': 50, 'School': 120, 'Todo': 260
    }[note.category] ?? 210;
    el.modalNoteCategory.style.borderColor = `hsl(${hue} 70% 60% / .6)`;
    el.modalNoteCategory.style.background = `linear-gradient(135deg, hsl(${hue} 70% 60% / .15), transparent)`;

    el.modalNoteContent.textContent = note.content;
    el.modalNoteCreated.textContent = `Created ${fmt(note.createdAt)}`;
    el.modalNoteUpdated.textContent = `Updated ${fmt(note.updatedAt)}`;
    el.noteModal.hidden = false;
  }

  function filterSortNotes(){
    const q = el.search.value.trim().toLowerCase();
    const cat = el.filterCategory.value;
    const sort = el.sortBy.value;

    let arr = state.notes.filter(n => {
      const folderName = n.folder ? getFolderName(n.folder) : ''; // Get folder name for search
      const inText = (n.title + ' ' + n.content + ' ' + n.category + ' ' + folderName).toLowerCase().includes(q);
      const catOk = !cat || n.category === cat;
      const folderOk = !state.currentFolderFilter || n.folder === state.currentFolderFilter;
      return inText && catOk && folderOk;
    });

    const cmp = {
      updatedDesc: (a,b)=> new Date(b.updatedAt)-new Date(a.updatedAt),
      updatedAsc: (a,b)=> new Date(a.updatedAt)-new Date(b.updatedAt),
      createdDesc: (a,b)=> new Date(b.createdAt)-new Date(a.createdAt),
      createdAsc: (a,b)=> new Date(a.createdAt)-new Date(b.createdAt),
      titleAsc: (a,b)=> a.title.localeCompare(b.title),
      titleDesc: (a,b)=> b.title.localeCompare(a.title),
      pinnedFirst: (a,b)=> Number(b.pinned)-Number(a.pinned) || new Date(b.updatedAt)-new Date(a.updatedAt),
    };
    arr.sort(cmp[sort] ?? cmp.updatedDesc);
    // Always promote pinned to top for most sorts except title sorts
    if(!['titleAsc','titleDesc'].includes(sort)){
      arr.sort((a,b)=> Number(b.pinned)-Number(a.pinned));
    }
    return arr;
  }

  function render(){
    populateFolderDropdowns();
    renderFolderNav();
    
    const list = filterSortNotes();
    el.grid.innerHTML = '';
    el.empty.hidden = list.length !== 0;

    for(const n of list){
      const node = el.tmpl.content.firstElementChild.cloneNode(true);
      node.dataset.id = n.id;
      if(n.pinned) node.classList.add('pinned');
      qs('.note-title', node).textContent = n.title;
      qs('.note-content', node).textContent = n.content;
      
      // Category chip
      const chip = qs('.category', node);
      chip.textContent = n.category;
      const hue = {
        'Work': 200, 'Personal': 330, 'Ideas': 50, 'School': 120, 'Todo': 260
      }[n.category] ?? 210;
      chip.style.borderColor = `hsl(${hue} 70% 60% / .6)`;
      chip.style.background = `linear-gradient(135deg, hsl(${hue} 70% 60% / .15), transparent)`;

      // Folder chip
      const folderChip = qs('.folder', node);
      if (n.folder) {
        const folder = state.folders.find(f => f.id === n.folder);
        folderChip.textContent = folder ? folder.name : n.folder;
        folderChip.style.display = 'inline-block';
        if (folder && folder.color) {
          folderChip.style.borderColor = folder.color + '80';
          folderChip.style.background = `linear-gradient(135deg, ${folder.color}20, transparent)`;
        }
      } else {
        folderChip.style.display = 'none';
      }

      qs('.stamp', node).textContent = `Created ${fmt(n.createdAt)} · Updated ${fmt(n.updatedAt)}${n.pinned ? ' · Pinned' : ''}`;

      el.grid.appendChild(node);
    }
  }

  // Initial render
  render();
})();
