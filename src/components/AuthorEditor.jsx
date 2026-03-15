// src/components/AuthorEditor.jsx
import { useState, useEffect, useCallback } from 'react';
import PocketBase from 'pocketbase';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight } from 'lowlight';
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import html from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';

// Create a lowlight instance and register languages
const lowlight = createLowlight();
lowlight.register('javascript', javascript);
lowlight.register('python', python);
lowlight.register('html', html);
lowlight.register('css', css);

export default function AuthorEditor() {
  const pb = new PocketBase('http://127.0.0.1:8090');

  // Load auth from cookie on mount
  useEffect(() => {
    const cookie = document.cookie.split('; ').find(row => row.startsWith('pb_auth='));
    if (cookie) pb.authStore.loadFromCookie(cookie);
  }, []);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('draft');
  const [categories, setCategories] = useState([]);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const slugPreview = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'article-' + Date.now().toString().slice(-6);

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const cats = await pb.collection('categories').getFullList({
          fields: 'id,name',
          sort: 'name',
        });
        setCategories(cats);
      } catch (err) {
        setError('Failed to load categories');
      } finally {
        setLoading(false);
      }
    }
    fetchCategories();
  }, [pb]);

  // Editor setup
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: true, allowBase64: true }),
      Placeholder.configure({ placeholder: 'Start writing your article...' }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: '<p></p>',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-lg lg:prose-xl dark:prose-invert focus:outline-none min-h-[500px] p-6 bg-base-100 dark:bg-base-300 rounded-xl border border-base-300 dark:border-base-700',
      },
    },
  });

  // Inline content image upload (temporary record method)
  const addImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const uploaded = await pb.collection('articles').create(
          { cover: file },
          { $autoCancel: false }
        );
        const fileUrl = pb.files.getURL(uploaded, uploaded.cover, { thumb: '1200x0' });
        editor.chain().focus().setImage({ src: fileUrl }).run();
      } catch (err) {
        alert('Image upload failed: ' + err.message);
      }
    };
    input.click();
  }, [editor]);

  // Handle cover image selection + local preview
  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCoverFile(file);

    const reader = new FileReader();
    reader.onloadend = () => setCoverPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!editor || !title.trim() || !category) {
      alert('Title and category are required');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('slug', slugPreview);
      formData.append('category', category);
      formData.append('body', editor.getHTML());
      formData.append('status', status);
      formData.append('published_at', new Date().toISOString());

      // Attach cover image if selected
      if (coverFile) {
        formData.append('cover', coverFile);
      }

      const created = await pb.collection('articles').create(formData);

      alert('Article saved! Slug: ' + slugPreview);

      setTimeout(() => {
        window.location.href = `/news/${slugPreview}`;
      }, 1500);

      // Reset form
      setTitle('');
      setCategory('');
      setStatus('draft');
      setCoverFile(null);
      setCoverPreview('');
      editor.commands.setContent('<p></p>');
    } catch (err) {
      alert('Failed to save article: ' + (err.message || 'Unknown error'));
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto px-4 py-8">

      {/* Cover Image Upload */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Cover Image</span>
          <span className="label-text-alt text-base-content/70">Recommended: 1200 × 630 px</span>
        </label>
        <div className="border-2 border-dashed border-base-300 dark:border-base-600 rounded-2xl p-8 text-center hover:border-primary/50 transition-colors">
          {coverPreview ? (
            <div className="space-y-4">
              <img
                src={coverPreview}
                alt="Cover preview"
                className="max-h-64 w-full object-cover rounded-xl shadow-md mx-auto"
              />
              <button
                type="button"
                className="btn btn-sm btn-outline btn-error gap-2"
                onClick={() => {
                  setCoverFile(null);
                  setCoverPreview('');
                }}
              >
                Remove cover
              </button>
            </div>
          ) : (
            <label className="cursor-pointer block">
              <div className="space-y-3">
                <div className="text-5xl opacity-40">🖼️</div>
                <div className="text-lg font-medium">Click to upload cover image</div>
                <div className="text-sm opacity-60">or drag & drop • jpg, png, webp</div>
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverChange}
              />
            </label>
          )}
        </div>
      </div>

      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Enter a captivating title..."
        className="input input-bordered w-full text-4xl font-bold bg-base-100 dark:bg-base-300 border-base-300 dark:border-base-700 focus:border-primary focus:ring-primary py-8 px-6"
        required
      />

      {/* Slug preview */}
      <div className="form-control">
        <label className="label">
          <span className="label-text">URL Slug (auto-generated)</span>
        </label>
        <div className="input input-bordered flex items-center bg-base-200 dark:bg-base-800 font-mono">
          /news/<span className="text-primary font-semibold">{slugPreview}</span>
        </div>
      </div>

      {/* Category */}
      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : error ? (
        <div className="alert alert-error">{error}</div>
      ) : categories.length === 0 ? (
        <div className="alert alert-warning">No categories found – please add some in admin panel</div>
      ) : (
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="select select-bordered w-full bg-base-100 dark:bg-base-300 text-base-content"
          required
        >
          <option value="">Select Category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      )}

      {/* Toolbar */}
      {editor && (
        <div className="flex flex-wrap gap-2 pb-3 border-b border-base-300 dark:border-base-700">
          <button onClick={() => editor.chain().focus().toggleBold().run()} className={`btn btn-sm ${editor.isActive('bold') ? 'btn-active' : ''}`}>Bold</button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`btn btn-sm ${editor.isActive('italic') ? 'btn-active' : ''}`}>Italic</button>
          <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`btn btn-sm ${editor.isActive('heading', { level: 2 }) ? 'btn-active' : ''}`}>H2</button>
          <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`btn btn-sm ${editor.isActive('bulletList') ? 'btn-active' : ''}`}>List</button>
          <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`btn btn-sm ${editor.isActive('blockquote') ? 'btn-active' : ''}`}>Quote</button>
          <button onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={`btn btn-sm ${editor.isActive('codeBlock') ? 'btn-active' : ''}`}>Code</button>
          <button onClick={addImage} className="btn btn-sm btn-neutral">Add Image</button>
        </div>
      )}

      {/* Editor Area */}
      {editor ? (
        <div className="border border-base-300 dark:border-base-700 rounded-2xl overflow-hidden bg-base-100 dark:bg-base-300 min-h-[500px] shadow-sm">
          <EditorContent editor={editor} />
        </div>
      ) : (
        <div className="border border-base-300 dark:border-base-700 rounded-2xl bg-base-100 dark:bg-base-300 min-h-[500px] flex items-center justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      )}

      {/* Publish Controls */}
      <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-base-300 dark:border-base-700">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="select select-bordered flex-1 bg-base-100 dark:bg-base-300"
        >
          <option value="draft">Save as Draft</option>
          <option value="published">Publish Now</option>
        </select>
        <button onClick={handleSubmit} className="btn btn-primary flex-1 text-lg">
          {status === 'published' ? 'Publish Article' : 'Save Draft'}
        </button>
      </div>
    </div>
  );
}