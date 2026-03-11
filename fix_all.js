const fs = require('fs');
const glob = require('glob');

function migratePath(p) {
    if (p === '@all') return p;
    p = p.replace(/;/g, 'close');
    p = p.replace(/!/g, 'fill');
    
    let tokens = p.split(/\s+/).filter(x => x.length > 0);
    let newTokens = [];
    
    for (let i = 0; i < tokens.length; i++) {
        let t = tokens[i];
        if (t === '+') { newTokens.push('include'); continue; }
        if (t === '-') { newTokens.push('exclude'); continue; }
        if (t === ',') { newTokens.push(','); continue; }
        
        let isAtom = t !== 'include' && t !== 'exclude' && t !== 'close' && t !== 'fill' && t !== ',' && !t.startsWith('~');
        
        if (t.startsWith('~') && t.length > 1 && t !== '~close' && t !== '~fill') {
            t = t.substring(1);
            if (newTokens.length > 0) {
                let prev = newTokens[newTokens.length - 1];
                if (prev !== 'include' && prev !== 'exclude' && prev !== ',' && prev !== 'fill' && prev !== 'close') {
                    newTokens.push('~');
                } else {
                    newTokens.push('~');
                }
            } else {
                newTokens.push('~');
            }
            newTokens.push(t);
            continue;
        }

        if (isAtom && newTokens.length > 0) {
            let prev = newTokens[newTokens.length - 1];
            let prevIsAtom = prev !== 'include' && prev !== 'exclude' && prev !== 'close' && prev !== 'fill' && prev !== ',' && prev !== '-' && prev !== '~';
            if (prevIsAtom) {
                newTokens.push('-');
            }
        }
        newTokens.push(t);
    }
    
    return newTokens.join(' ');
}

const files = [
    ...glob.sync('maps/definitions/*.yaml'),
    ...glob.sync('editor/public/maps/*.yaml'),
    ...glob.sync('rfc/examples/snippets/*.yaml'),
    ...glob.sync('core/src/**/*.test.ts')
];

for (let f of files) {
    let content = fs.readFileSync(f, 'utf8');
    let modified = false;

    // Use \b to ensure it's not "wall:"
    content = content.replace(/\ball:\s*(["'])(.+?)\1/g, (match, q, p) => {
        let mp = migratePath(p);
        if (mp !== p) modified = true;
        return `all: ${q}${mp}${q}`;
    });

    if (modified) {
        fs.writeFileSync(f, content);
        console.log("Updated", f);
    }
}
