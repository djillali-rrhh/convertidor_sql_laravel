// =========================================================
//  SQL SERVER → LARAVEL MIGRATION CONVERTER (MEJORADO Y CORREGIDO)
// =========================================================

function sqlToLaravelMigration(sqlInput, tableName = null) {
    const { table, columns, constraints } = processSql(sqlInput, tableName);
    return generateMigration(table, columns, constraints);
}

// =========================================================
//  PROCESS SQL
// =========================================================

function processSql(sql, tableNameOverride = null) {
    const lines = sql
        .replace(/\r/g, '')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('--'));

    let tableName = tableNameOverride;
    let columns = [];
    let constraints = [];
    let insideColumns = false;

    for (let line of lines) {
        if (!tableName && line.match(/CREATE\s+TABLE/i)) {
            const match = line.match(/CREATE\s+TABLE\s+\[?(\w+)\]?/i);
            if (match) tableName = match[1];
            insideColumns = true;
            continue;
        }

        if (!insideColumns) continue;

        if (line === ')' || line === ');' || line === 'GO') break;

        let clean = line.replace(/,$/, '');
        processLine(clean, columns, constraints);
    }

    return { table: tableName, columns, constraints };
}

// =========================================================
//  PROCESS LINE (COLUMN / UNIQUE / PK / FK)
// =========================================================

function processLine(line, columns, constraints) {
    line = line.trim();

    // ---- PRIMARY KEY (tabla) ----
    if (line.toUpperCase().includes('PRIMARY KEY') && !line.match(/^\[/)) {
        const pkMatch = line.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
        if (pkMatch) {
            const cols = pkMatch[1]
                .split(',')
                .map(c => c.trim().replace(/[\[\]]/g, ''));
            constraints.push({ type: 'primary', columns: cols });
        }
        return;
    }

    // ---- FOREIGN KEY ----
    if (line.toUpperCase().includes('FOREIGN KEY')) {
        const fkMatch = line.match(
            /FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+(\[?\w+\]?)[.\s]*\(([^)]+)\)(?:\s+ON\s+DELETE\s+(\w+))?(?:\s+ON\s+UPDATE\s+(\w+))?/i
        );

        if (fkMatch) {
            constraints.push({
                type: 'foreign',
                column: fkMatch[1].trim().replace(/[\[\]]/g, ''),
                references: fkMatch[3].trim().replace(/[\[\]]/g, ''),
                on: fkMatch[2].replace(/[\[\]]/g, ''),
                onDelete: fkMatch[4] ? fkMatch[4].toLowerCase() : null,
                onUpdate: fkMatch[5] ? fkMatch[5].toLowerCase() : null
            });
        }
        return;
    }

    // ---- UNIQUE (tabla) ----
    if (line.toUpperCase().startsWith('UNIQUE(')) {
        const uniqueMatch = line.match(/UNIQUE\s*\(([^)]+)\)/i);
        if (uniqueMatch) {
            const cols = uniqueMatch[1]
                .split(',')
                .map(c => c.trim().replace(/[\[\]]/g, ''));
            constraints.push({ type: 'unique', columns: cols });
        }
        return;
    }

    // ---- COLUMNA ---- (MEJORADO PARA CAPTURAR MAX Y DATETIME2(0))
    const columnMatch = line.match(
        /^\[?(\w+)\]?\s+([^\s(]+)(?:\(([^\)]+)\))?(.*)/i
    );

    if (columnMatch) {
        const [, name, type, lengthPart, rest] = columnMatch;
        const upperRest = (rest || '').toUpperCase();

        // Parsear length y precision
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

        const column = {
            name: name.replace(/[\[\]]/g, ''),
            type,
            length: length,
            precision: precision,
            nullable: !upperRest.includes('NOT NULL'),
            primaryKey:
                upperRest.includes('PRIMARY KEY') ||
                /\bPRIMARY\s+KEY\b/i.test(rest),
            autoIncrement: isIdentity || upperRest.includes('AUTO_INCREMENT'),
            unique: upperRest.includes('UNIQUE'),
            default: null
        };

        // Capturar DEFAULT con paréntesis: DEFAULT (1), DEFAULT (getdate()), etc.
        const defaultMatch = rest.match(/DEFAULT\s*\(([^)]+)\)/i);
        if (defaultMatch) {
            column.default = defaultMatch[1].trim();
        }

        columns.push(column);
    }
}

// =========================================================
//  MAP SQL TYPE → LARAVEL TYPE
// =========================================================

function mapTypeToLaravel(col) {
    let baseType = col.type.toLowerCase();

    // Auto-increment con primary key siempre es "id"
    if (col.autoIncrement && col.primaryKey) return 'id';

    if (baseType.includes('bigint')) return 'bigInteger';
    if (baseType.includes('tinyint')) return 'tinyInteger';
    if (baseType.includes('smallint')) return 'smallInteger';
    if (baseType.includes('int')) return 'integer';
    
    if (baseType.includes('bit')) return 'boolean';
    
    if (baseType.includes('decimal') || baseType.includes('numeric')) return 'decimal';
    
    if (baseType.includes('datetime')) return 'dateTime';
    if (baseType.includes('date')) return 'date';
    if (baseType.includes('time')) return 'time';

    if (baseType.includes('nvarchar') || baseType.includes('varchar')) {
        // Si es MAX o no tiene length, usar text
        if (col.length === 'MAX' || !col.length) return 'text';
        return 'string';
    }

    if (baseType.includes('text') || baseType.includes('ntext')) return 'text';

    return 'string';
}

// =========================================================
//  GENERATOR
// =========================================================

function generateMigration(table, columns, constraints) {
    let out = `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;
use Illuminate\\Support\\Facades\\DB;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('${table}', function (Blueprint $table) {
`;

    columns.forEach(col => {
        let line = '            ';

        // ---- PRIMARY KEY AUTO-INCREMENT ----
        if (col.autoIncrement && col.primaryKey) {
            line += `$table->id('${col.name}');`;
            out += line + '\n';
            return;
        }

        const laravelType = mapTypeToLaravel(col);

        // ---- NORMAL TYPE ----
        line += `$table->${laravelType}('${col.name}'`;

        if (laravelType === 'string' && col.length && col.length !== 'MAX') {
            line += `, ${col.length}`;
        }

        if (laravelType === 'decimal') {
            const p = col.length || 10;
            const s = col.precision || 2;
            line += `, ${p}, ${s}`;
        }

        line += ')';

        if (col.nullable) line += '->nullable()';

        if (col.default !== null) {
            const def = col.default.trim();
            
            // Manejar getdate() y CURRENT_TIMESTAMP
            if (def.toLowerCase() === 'getdate' || def.toLowerCase() === 'current_timestamp') {
                line += `->default(DB::raw('CURRENT_TIMESTAMP'))`;
            }
            // Convertir 1/0 a true/false para booleanos
            else if (def === '1' && laravelType === 'boolean') {
                line += '->default(true)';
            }
            else if (def === '0' && laravelType === 'boolean') {
                line += '->default(false)';
            }
            // Números normales
            else if (!isNaN(def)) {
                line += `->default(${def})`;
            }
            // Strings
            else {
                line += `->default('${def}')`;
            }
        }

        if (col.unique && !col.primaryKey) line += '->unique()';

        line += ';';
        out += line + '\n';
    });

    // ---- CONSTRAINTS ----
    constraints.forEach(c => {
        if (c.type === 'primary') {
            out += `            $table->primary([${c.columns.map(x => `'${x}'`).join(', ')}]);\n`;
        }
        if (c.type === 'unique') {
            out += `            $table->unique([${c.columns.map(x => `'${x}'`).join(', ')}]);\n`;
        }
        if (c.type === 'foreign') {
            let fk = `            $table->foreign('${c.column}')->references('${c.references}')->on('${c.on}')`;
            if (c.onDelete) fk += `->onDelete('${c.onDelete}')`;
            if (c.onUpdate) fk += `->onUpdate('${c.onUpdate}')`;
            fk += ';\n';
            out += fk;
        }
    });

    // Solo agregar timestamps si NO existen created_at Y updated_at
    const hasCreatedAt = columns.some(c => c.name === 'created_at');
    const hasUpdatedAt = columns.some(c => c.name === 'updated_at');
    
    if (!hasCreatedAt && !hasUpdatedAt) {
        out += `            $table->timestamps();\n`;
    }

    out += `
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('${table}');
    }
};
`;

    return out;
}

export { sqlToLaravelMigration };