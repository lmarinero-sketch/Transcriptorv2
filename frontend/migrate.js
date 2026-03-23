const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const destDir = path.join(__dirname, 'vite-frontend', 'src');

function copyAndTransformFile(filePath, isAppDir = false) {
    const ext = path.extname(filePath);
    if (!['.ts', '.tsx', '.css'].includes(ext)) return;

    let content = fs.readFileSync(filePath, 'utf8');

    // Remove Next.js "use client" directives
    content = content.replace(/^['"]use client['"];?\n?/m, '');

    // Replace next/link
    content = content.replace(/import Link from ['"]next\/link['"];?/g, 'import { Link } from "react-router-dom";');
    // Replace <Link href=... with <Link to=...
    content = content.replace(/<Link([^>]+)href=/g, '<Link$1to=');

    // Replace next/image
    content = content.replace(/import Image from ['"]next\/image['"];?/g, '');
    content = content.replace(/<Image([^>]+)src=/g, '<img$1src=');

    // Replace next/navigation hooks
    content = content.replace(/import {([^}]*)} from ['"]next\/navigation['"]/g, (match, imports) => {
        let newImports = [];
        if (imports.includes('useRouter')) newImports.push('useNavigate');
        if (imports.includes('usePathname')) newImports.push('useLocation');
        return newImports.length > 0 ? `import { ${newImports.join(', ')} } from "react-router-dom"` : '';
    });
    content = content.replace(/const router = useRouter\(\)/g, 'const navigate = useNavigate()');
    content = content.replace(/router\.push\(/g, 'navigate(');
    content = content.replace(/const pathname = usePathname\(\)/g, 'const location = useLocation();\n  const pathname = location.pathname');

    // Replace NEXT_PUBLIC with VITE
    content = content.replace(/process\.env\.NEXT_PUBLIC_/g, 'import.meta.env.VITE_');

    // Figure out the new path
    let relPath = path.relative(srcDir, filePath);
    
    // Convert app/route/page.tsx to pages/Route.tsx
    if (isAppDir && relPath.startsWith('app\\') || relPath.startsWith('app/')) {
        let routePath = relPath.replace('app\\', '').replace('app/', '');
        let newFileName = '';
        
        if (routePath === 'page.tsx') {
            newFileName = 'pages/Dashboard.tsx';
        } else if (routePath === 'layout.tsx') {
            newFileName = 'layouts/MainLayout.tsx';
        } else if (routePath === 'globals.css') {
            newFileName = 'index.css';
        } else {
            // e.g., login/page.tsx -> pages/Login.tsx
            const parts = routePath.split(path.sep);
            if (parts[parts.length - 1] === 'page.tsx') {
                const folderName = parts[parts.length - 2];
                // Capitalize first letter
                const pascalCase = folderName.charAt(0).toUpperCase() + folderName.slice(1);
                newFileName = `pages/${pascalCase}.tsx`;
            } else if (routePath.includes('[id]')) {
                 newFileName = `pages/MeetingDetail.tsx`; // Specific hardcode for meeting/[id]/page.tsx
            } else {
                newFileName = routePath;
            }
        }
        
        const destPath = path.join(destDir, newFileName);
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.writeFileSync(destPath, content);
        console.log(`Migrated ${relPath} to ${newFileName}`);
    } else {
        // Just copy lib, context, components directly
        const destPath = path.join(destDir, relPath);
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.writeFileSync(destPath, content);
        console.log(`Copied ${relPath}`);
    }
}

function walkDir(dir, callback, isAppDir = false) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback, isAppDir);
        } else {
            callback(path.join(dir, f), isAppDir);
        }
    });
}

// Ensure destDir exists
if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

// Walk lib, context, and app directories
if (fs.existsSync(path.join(srcDir, 'lib'))) walkDir(path.join(srcDir, 'lib'), (p) => copyAndTransformFile(p, false));
if (fs.existsSync(path.join(srcDir, 'context'))) walkDir(path.join(srcDir, 'context'), (p) => copyAndTransformFile(p, false));
if (fs.existsSync(path.join(srcDir, 'components'))) walkDir(path.join(srcDir, 'components'), (p) => copyAndTransformFile(p, false));
if (fs.existsSync(path.join(srcDir, 'app'))) walkDir(path.join(srcDir, 'app'), (p) => copyAndTransformFile(p, true));

console.log('Migration script complete!');
