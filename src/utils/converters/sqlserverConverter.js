function processSqlServer(sql, tableNameOverride = null) {
    const lines = sql
        .replace(/\r/g, '')
        .split('\n')
        .map(line => {
            const commentIndex = line.indexOf('--');
            if (commentIndex !== -1) {
                line = line.substring(0, commentIndex);
            }
            return line.trim();
        })
        .filter(line => line.length > 0 && line !== 'GO');

    let tableName = tableNameOverride;
    let columns = [];
    let constraints = [];
    let insideColumns = false;
    let skipNextLines = 0;

    for (let i = 0; i < lines.length; i++) {
        if (skipNextLines > 0) {
            skipNextLines--;
            continue;
        }

        let line = lines[i];

        if (!tableName && line.match(/CREATE\s+TABLE/i)) {
            const match = line.match(/CREATE\s+TABLE\s+\[?(\w+)\]?/i);
            if (match) tableName = match[1];
            insideColumns = true;
            continue;
        }

        if (!insideColumns) continue;

        if (line === ')' || line === ');') {
            insideColumns = false;
            continue;
        }

        // Si la línea empieza con CONSTRAINT, procesarla completa (puede ser multilínea)
        if (line.match(/^\s*CONSTRAINT\s+/i)) {
            let constraintText = line;
            
            // Si no termina con coma o paréntesis, recolectar más líneas
            if (!line.match(/[,;)]$/)) {
                for (let j = i + 1; j < lines.length; j++) {
                    let nextLine = lines[j].trim();
                    constraintText += ' ' + nextLine;
                    skipNextLines++;
                    
                    if (nextLine.match(/[,;)]$/)) {
                        break;
                    }
                }
            }
            
            processLineSqlServer(constraintText.replace(/,$/, ''), columns, constraints);
            continue;
        }

        let clean = line.replace(/,$/, '');
        processLineSqlServer(clean, columns, constraints);
    }

    return { table: tableName, columns, constraints };
}

function processLineSqlServer(line, columns, constraints) {
    line = line.trim();

    // 1. CHECK constraints - IGNORAR
    if (line.match(/CONSTRAINT\s+\[?\w+\]?\s+CHECK/i)) {
        return;
    }

    // 2. CONSTRAINT FOREIGN KEY
    if (line.match(/CONSTRAINT\s+\[?\w+\]?\s+FOREIGN\s+KEY/i)) {
        const fkMatch = line.match(
            /FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+(\[?\w+\]?)\s*\(([^)]+)\)(?:\s+ON\s+DELETE\s+(CASCADE|SET\s+NULL|NO\s+ACTION|RESTRICT))?(?:\s+ON\s+UPDATE\s+(CASCADE|SET\s+NULL|NO\s+ACTION|RESTRICT))?/i
        );

        if (fkMatch) {
            const onDelete = fkMatch[4] ? fkMatch[4].replace(/\s+/g, '').toLowerCase() : null;
            const onUpdate = fkMatch[5] ? fkMatch[5].replace(/\s+/g, '').toLowerCase() : null;
            
            constraints.push({
                type: 'foreign',
                column: fkMatch[1].trim().replace(/[\[\]]/g, ''),
                references: fkMatch[3].trim().replace(/[\[\]]/g, ''),
                on: fkMatch[2].replace(/[\[\]]/g, ''),
                onDelete: onDelete,
                onUpdate: onUpdate
            });
        }
        return;
    }

    // 3. CONSTRAINT UNIQUE
    if (line.match(/CONSTRAINT\s+\[?\w+\]?\s+UNIQUE/i)) {
        const uniqueMatch = line.match(/UNIQUE\s*\(([^)]+)\)/i);
        if (uniqueMatch) {
            const cols = uniqueMatch[1].split(',').map(c => c.trim().replace(/[\[\]]/g, ''));
            constraints.push({ type: 'unique', columns: cols });
        }
        return;
    }

    // 4. CONSTRAINT PRIMARY KEY
    if (line.match(/CONSTRAINT\s+\[?\w+\]?\s+PRIMARY\s+KEY/i)) {
        const pkMatch = line.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
        if (pkMatch) {
            const cols = pkMatch[1].split(',').map(c => c.trim().replace(/[\[\]]/g, ''));
            constraints.push({ type: 'primary', columns: cols });
        }
        return;
    }

    // 5. PRIMARY KEY sin CONSTRAINT
    if (line.toUpperCase().includes('PRIMARY KEY') && !line.match(/^\[?\w+\]?\s+\w+/)) {
        const pkMatch = line.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
        if (pkMatch) {
            const cols = pkMatch[1].split(',').map(c => c.trim().replace(/[\[\]]/g, ''));
            constraints.push({ type: 'primary', columns: cols });
        }
        return;
    }

    // 6. FOREIGN KEY sin CONSTRAINT
    if (line.toUpperCase().includes('FOREIGN KEY') && !line.match(/CONSTRAINT/i)) {
        const fkMatch = line.match(
            /FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+(\[?\w+\]?)[.\s]*\(([^)]+)\)(?:\s+ON\s+DELETE\s+(CASCADE|SET\s+NULL|NO\s+ACTION|RESTRICT))?(?:\s+ON\s+UPDATE\s+(CASCADE|SET\s+NULL|NO\s+ACTION|RESTRICT))?/i
        );

        if (fkMatch) {
            const onDelete = fkMatch[4] ? fkMatch[4].replace(/\s+/g, '').toLowerCase() : null;
            const onUpdate = fkMatch[5] ? fkMatch[5].replace(/\s+/g, '').toLowerCase() : null;
            
            constraints.push({
                type: 'foreign',
                column: fkMatch[1].trim().replace(/[\[\]]/g, ''),
                references: fkMatch[3].trim().replace(/[\[\]]/g, ''),
                on: fkMatch[2].replace(/[\[\]]/g, ''),
                onDelete: onDelete,
                onUpdate: onUpdate
            });
        }
        return;
    }

    // 7. UNIQUE sin nombre
    if (line.toUpperCase().startsWith('UNIQUE(')) {
        const uniqueMatch = line.match(/UNIQUE\s*\(([^)]+)\)/i);
        if (uniqueMatch) {
            const cols = uniqueMatch[1].split(',').map(c => c.trim().replace(/[\[\]]/g, ''));
            constraints.push({ type: 'unique', columns: cols });
        }
        return;
    }

    // 8. Columna - verificar que NO sea una palabra clave SQL
    const columnMatch = line.match(/^\[?(\w+)\]?\s+([^\s(]+)(?:\(([^\)]+)\))?(.*)/i);
    if (columnMatch) {
        const [, name, type, lengthPart, rest] = columnMatch;
        
        // Lista de palabras clave SQL que NO son columnas
        const sqlKeywords = [
            'CONSTRAINT', 'FOREIGN', 'REFERENCES', 'PRIMARY', 'UNIQUE', 'CHECK', 
            'ON', 'DELETE', 'UPDATE', 'CASCADE', 'KEY', 'NULL', 'DEFAULT',
            'INDEX', 'ALTER', 'ADD', 'DROP'
        ];
        
        if (sqlKeywords.includes(name.toUpperCase())) {
            return;
        }

        const upperRest = (rest || '').toUpperCase();
        const upperType = type.toUpperCase();

        let length = null;
        let precision = null;

        if (lengthPart) {
            if (lengthPart.toUpperCase() === 'MAX') {
                length = 'MAX';
            } else if (lengthPart.includes(',')) {
                const parts = lengthPart.split(',').map(p => p.trim());
                length = parts[0];
                precision = parts[1];
            } else {
                length = lengthPart;
            }
        }

        const isIdentity = /IDENTITY\s*\(\s*\d+\s*,\s*\d+\s*\)/i.test(rest);
        const hasPrimaryKey = upperRest.includes('PRIMARY KEY');

        const column = {
            name: name.replace(/[\[\]]/g, ''),
            type: type.replace(/\s+PRIMARY\s+KEY/i, '').trim(),
            length: length,
            precision: precision,
            nullable: !upperRest.includes('NOT NULL') && !hasPrimaryKey,
            primaryKey: hasPrimaryKey,
            autoIncrement: isIdentity,
            unique: upperRest.includes('UNIQUE') && !line.match(/CONSTRAINT.*UNIQUE/i),
            default: null
        };

        const defaultMatch = rest.match(/DEFAULT\s*\(([^)]+)\)/i) || 
                           rest.match(/DEFAULT\s+([^\s,]+)/i);
        if (defaultMatch) {
            column.default = defaultMatch[1].trim();
        }

        columns.push(column);
    }
}

function mapSqlServerTypeToLaravel(col) {
    let baseType = col.type.toLowerCase();

    if (col.autoIncrement && col.primaryKey) return 'id';

    if (baseType.includes('bigint')) return 'bigInteger';
    if (baseType.includes('tinyint')) return 'tinyInteger';
    if (baseType.includes('smallint')) return 'smallInteger';
    if (baseType.includes('int')) return 'integer';
    
    if (baseType.includes('bit')) return 'boolean';
    
    if (baseType.includes('money') || baseType.includes('smallmoney')) return 'decimal';
    if (baseType.includes('decimal') || baseType.includes('numeric')) return 'decimal';
    if (baseType.includes('float') || baseType.includes('real')) return 'float';
    
    if (baseType.includes('datetime2') || baseType.includes('datetime')) return 'dateTime';
    if (baseType.includes('date')) return 'date';
    if (baseType.includes('time')) return 'time';
    if (baseType.includes('timestamp')) return 'timestamp';

    if ((baseType.includes('nvarchar') || baseType.includes('varchar')) && col.length === 'MAX') {
        return 'json';
    }

    if (baseType.includes('nvarchar') || baseType.includes('varchar')) {
        if (!col.length) return 'text';
        return 'string';
    }

    if (baseType.includes('text') || baseType.includes('ntext')) return 'text';
    if (baseType.includes('char')) return 'char';

    return 'string';
}

function toSnakeCase(str) {
    return str
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '');
}

function generateSqlServerMigration(table, columns, constraints) {
    const laravelTableName = toSnakeCase(table);
    
    const usesDbRaw = columns.some(col => {
        if (!col.default) return false;
        const def = col.default.trim().replace(/[()]/g, '').toLowerCase();
        return def === 'getdate' || def === 'current_timestamp';
    });

    let out = `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;
`;

    if (usesDbRaw) {
        out += `use Illuminate\\Support\\Facades\\DB;\n`;
    }

    out += `
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('${laravelTableName}', function (Blueprint $table) {
`;

    const compositePK = constraints.find(c => c.type === 'primary' && c.columns.length > 1);
    const pkColumns = compositePK ? compositePK.columns : [];

    columns.forEach(col => {
        let line = '            ';

        // Si tiene IDENTITY y PRIMARY KEY, usar id()
        if (col.autoIncrement && col.primaryKey) {
            line += col.name === 'id' ? `$table->id();` : `$table->id('${col.name}');`;
            out += line + '\n';
            return;
        }

        const fk = constraints.find(c => c.type === 'foreign' && c.column === col.name);
        const isPartOfCompositePK = pkColumns.includes(col.name);
        
        if (fk && !isPartOfCompositePK) {
            line += `$table->unsignedBigInteger('${col.name}')`;
            if (col.nullable) line += '->nullable()';
            line += ';';
            out += line + '\n';
            fk.needsDeclaration = true;
            return;
        }

        const laravelType = mapSqlServerTypeToLaravel(col);
        line += `$table->${laravelType}('${col.name}'`;

        if (laravelType === 'string' && col.length && col.length !== 'MAX') {
            line += `, ${col.length}`;
        }
        if (laravelType === 'char' && col.length) {
            line += `, ${col.length}`;
        }
        if (laravelType === 'decimal') {
            if (col.type.toLowerCase().includes('money')) {
                line += `, 19, 4`;
            } else {
                const p = col.length || 10;
                const s = col.precision || 2;
                line += `, ${p}, ${s}`;
            }
        }

        line += ')';

        if (col.nullable) line += '->nullable()';

        if (col.default !== null) {
            const def = col.default.trim().replace(/[()]/g, '').replace(/'/g, '');
            
            if (def.toLowerCase() === 'getdate' || def.toLowerCase() === 'current_timestamp') {
                line += `->default(DB::raw('CURRENT_TIMESTAMP'))`;
            }
            else if (def.toLowerCase() === 'sysutcdatetime') {
                line += `->useCurrent()`;
            }
            else if (def === '1' && laravelType === 'boolean') {
                line += '->default(true)';
            }
            else if (def === '0' && laravelType === 'boolean') {
                line += '->default(false)';
            }
            else if (!isNaN(def)) {
                line += `->default(${def})`;
            }
            else {
                line += `->default('${def}')`;
            }
        }

        if (col.unique && !col.primaryKey) line += '->unique()';
        if (col.primaryKey && !col.autoIncrement && !isPartOfCompositePK) line += '->primary()';

        line += ';';
        out += line + '\n';
    });

    constraints.forEach(c => {
        if (c.type === 'foreign' && c.needsDeclaration) {
            const laravelRefTable = toSnakeCase(c.on);
            let fk = `            $table->foreign('${c.column}')->references('${c.references}')->on('${laravelRefTable}')`;
            
            const col = columns.find(col => col.name === c.column);
            if (!c.onDelete && col && col.nullable) {
                fk += `->onDelete('setnull')`;
            } else if (c.onDelete) {
                fk += `->onDelete('${c.onDelete}')`;
            }
            
            if (c.onUpdate) fk += `->onUpdate('${c.onUpdate}')`;
            fk += ';\n';
            out += fk;
        }
    });

    constraints.forEach(c => {
        if (c.type === 'primary' && c.columns.length > 1) {
            out += `            $table->primary([${c.columns.map(x => `'${x}'`).join(', ')}]);\n`;
        }
        
        if (c.type === 'unique') {
            if (c.columns.length === 1) {
                out += `            $table->unique('${c.columns[0]}');\n`;
            } else {
                out += `            $table->unique([${c.columns.map(x => `'${x}'`).join(', ')}]);\n`;
            }
        }
    });

    const hasCreatedAt = columns.some(c => c.name === 'created_at');
    const hasUpdatedAt = columns.some(c => c.name === 'updated_at');
    
    if (!hasCreatedAt && !hasUpdatedAt) {
        out += `            $table->timestamps();\n`;
    }

    out += `        });
    }

    public function down(): void
    {
        Schema::dropIfExists('${laravelTableName}');
    }
};
`;

    return out;
}

export function sqlserverToLaravelMigration(sqlInput, tableName = null) {
    const { table, columns, constraints } = processSqlServer(sqlInput, tableName);
    return generateSqlServerMigration(table, columns, constraints);
}
