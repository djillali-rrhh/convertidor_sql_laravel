function processMySql(sql, tableNameOverride = null) {
    const lines = sql
        .replace(/\r/g, '')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('--') && !line.startsWith('#'));

    let tableName = tableNameOverride;
    let columns = [];
    let constraints = [];
    let insideColumns = false;

    for (let line of lines) {
        if (!tableName && line.match(/CREATE\s+TABLE/i)) {
            const match = line.match(/CREATE\s+TABLE\s+`?(\w+)`?/i);
            if (match) tableName = match[1];
            insideColumns = true;
            continue;
        }

        if (line === ')' || line.match(/^\)\s*ENGINE/i) || line === ');') {
            insideColumns = false;
            continue;
        }

        if (!insideColumns) continue;

        let clean = line.replace(/,$/, '');
        processLine(clean, columns, constraints);
    }

    return { table: tableName, columns, constraints };
}

function processLine(line, columns, constraints) {
    line = line.trim();

    if (line.toUpperCase().includes('PRIMARY KEY') && !line.match(/^`?\w+`?\s+\w+/)) {
        const pkMatch = line.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
        if (pkMatch) {
            const cols = pkMatch[1].split(',').map(c => c.trim().replace(/[`]/g, ''));
            constraints.push({ type: 'primary', columns: cols });
        }
        return;
    }

    if (line.match(/UNIQUE\s+KEY/i) && !line.match(/^`?\w+`?\s+\w+/)) {
        const uniqueMatch = line.match(/UNIQUE\s+KEY\s+`?\w+`?\s*\(([^)]+)\)/i);
        if (uniqueMatch) {
            const cols = uniqueMatch[1].split(',').map(c => c.trim().replace(/[`]/g, ''));
            constraints.push({ type: 'unique', columns: cols });
        }
        return;
    }

    if (line.toUpperCase().includes('FOREIGN KEY')) {
        const fkMatch = line.match(
            /FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+`?(\w+)`?\s*\(([^)]+)\)(?:\s+ON\s+DELETE\s+(\w+))?(?:\s+ON\s+UPDATE\s+(\w+))?/i
        );
        if (fkMatch) {
            constraints.push({
                type: 'foreign',
                column: fkMatch[1].trim().replace(/[`]/g, ''),
                references: fkMatch[3].trim().replace(/[`]/g, ''),
                on: fkMatch[2].trim(),
                onDelete: fkMatch[4] ? fkMatch[4].toLowerCase() : null,
                onUpdate: fkMatch[5] ? fkMatch[5].toLowerCase() : null
            });
        }
        return;
    }

    const columnMatch = line.match(/^`?(\w+)`?\s+([^\s(]+)(?:\(([^\)]+)\))?(.*)/i);
    if (columnMatch) {
        const [, name, type, lengthPart, rest] = columnMatch;
        const upperRest = (rest || '').toUpperCase();

        let length = null;
        let precision = null;

        if (lengthPart) {
            if (lengthPart.includes(',')) {
                const parts = lengthPart.split(',').map(p => p.trim());
                length = parts[0];
                precision = parts[1];
            } else {
                length = lengthPart;
            }
        }

        const isAutoIncrement = upperRest.includes('AUTO_INCREMENT');
        const hasPrimaryKey = upperRest.includes('PRIMARY KEY');

        const column = {
            name: name,
            type: type,
            length: length,
            precision: precision,
            nullable: !upperRest.includes('NOT NULL') && !hasPrimaryKey,
            primaryKey: hasPrimaryKey,
            autoIncrement: isAutoIncrement,
            unique: upperRest.includes('UNIQUE'),
            default: null
        };

        const defaultMatch = rest.match(/DEFAULT\s+([^\s,]+)/i);
        if (defaultMatch) {
            column.default = defaultMatch[1].replace(/['"]/g, '');
        }

        columns.push(column);
    }
}

function mapMySqlTypeToLaravel(col) {
    let baseType = col.type.toLowerCase();
    if (col.autoIncrement && col.primaryKey) return 'id';
    if (baseType.includes('bigint')) return 'bigInteger';
    if (baseType.includes('tinyint')) {
        if (col.length === '1') return 'boolean';
        return 'tinyInteger';
    }
    if (baseType.includes('smallint')) return 'smallInteger';
    if (baseType.includes('int')) return 'integer';
    if (baseType.includes('decimal') || baseType.includes('numeric')) return 'decimal';
    if (baseType.includes('float')) return 'float';
    if (baseType.includes('double')) return 'double';
    if (baseType.includes('datetime')) return 'dateTime';
    if (baseType.includes('timestamp')) return 'timestamp';
    if (baseType.includes('date')) return 'date';
    if (baseType.includes('time')) return 'time';
    if (baseType.includes('varchar')) return 'string';
    if (baseType.includes('text')) return 'text';
    if (baseType.includes('char')) return 'char';
    if (baseType.includes('json')) return 'json';
    return 'string';
}

function generateMySqlMigration(table, columns, constraints) {
    let out = `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('${table}', function (Blueprint $table) {
`;

    const compositePK = constraints.find(c => c.type === 'primary' && c.columns.length > 1);
    const pkColumns = compositePK ? compositePK.columns : [];

    columns.forEach(col => {
        let line = '            ';
        if (col.autoIncrement && col.primaryKey) {
            line += col.name === 'id' ? `$table->id();` : `$table->id('${col.name}');`;
            out += line + '\n';
            return;
        }

        const fk = constraints.find(c => c.type === 'foreign' && c.column === col.name);
        const isPartOfCompositePK = pkColumns.includes(col.name);
        
        if (fk && !isPartOfCompositePK && fk.references === 'id') {
            line += `$table->foreignId('${col.name}')->constrained('${fk.on}')`;
            if (fk.onDelete) line += `->onDelete('${fk.onDelete}')`;
            if (fk.onUpdate) line += `->onUpdate('${fk.onUpdate}')`;
            if (col.nullable) line += '->nullable()';
            line += ';';
            out += line + '\n';
            fk.processed = true;
            return;
        }

        const laravelType = mapMySqlTypeToLaravel(col);
        line += `$table->${laravelType}('${col.name}'`;

        if (laravelType === 'string' && col.length) line += `, ${col.length}`;
        if (laravelType === 'char' && col.length) line += `, ${col.length}`;
        if (laravelType === 'decimal') {
            const p = col.length || 10;
            const s = col.precision || 2;
            line += `, ${p}, ${s}`;
        }

        line += ')';
        if (col.autoIncrement && !col.primaryKey) line += '->autoIncrement()';
        if (col.nullable) line += '->nullable()';
        if (col.default !== null) {
            if (col.default.toUpperCase() === 'CURRENT_TIMESTAMP') {
                line += `->useCurrent()`;
            } else if (!isNaN(col.default)) {
                line += `->default(${col.default})`;
            } else {
                line += `->default('${col.default}')`;
            }
        }
        if (col.unique && !col.primaryKey) line += '->unique()';
        if (col.primaryKey && !col.autoIncrement && !isPartOfCompositePK) line += '->primary()';

        line += ';';
        out += line + '\n';
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
        if (c.type === 'foreign' && !c.processed) {
            let fk = `            $table->foreign('${c.column}')->references('${c.references}')->on('${c.on}')`;
            if (c.onDelete) fk += `->onDelete('${c.onDelete}')`;
            if (c.onUpdate) fk += `->onUpdate('${c.onUpdate}')`;
            fk += ';\n';
            out += fk;
        }
    });

    const hasTimestamps = columns.some(c => c.name === 'created_at' || c.name === 'updated_at');
    if (!hasTimestamps) out += `            $table->timestamps();\n`;

    out += `        });
    }

    public function down(): void
    {
        Schema::dropIfExists('${table}');
    }
};
`;
    return out;
}

export function mysqlToLaravelMigration(sqlInput, tableName = null) {
    const { table, columns, constraints } = processMySql(sqlInput, tableName);
    return generateMySqlMigration(table, columns, constraints);
}
