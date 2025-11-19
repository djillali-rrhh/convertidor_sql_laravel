function processPostgreSql(sql, tableNameOverride = null) {
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
            const match = line.match(/CREATE\s+TABLE\s+"?(\w+)"?/i);
            if (match) tableName = match[1];
            insideColumns = true;
            continue;
        }

        if (line === ')' || line === ');') {
            insideColumns = false;
            continue;
        }

        if (!insideColumns) continue;

        let clean = line.replace(/,$/, '');
        processLinePostgres(clean, columns, constraints);
    }

    return { table: tableName, columns, constraints };
}

function processLinePostgres(line, columns, constraints) {
    line = line.trim();

    // PRIMARY KEY constraint
    if (line.toUpperCase().includes('PRIMARY KEY') && !line.match(/^"?\w+"?\s+\w+/)) {
        const pkMatch = line.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
        if (pkMatch) {
            const cols = pkMatch[1].split(',').map(c => c.trim().replace(/["]/g, ''));
            constraints.push({ type: 'primary', columns: cols });
        }
        return;
    }

    // UNIQUE constraint
    if (line.match(/UNIQUE/i) && !line.match(/^"?\w+"?\s+\w+/)) {
        const uniqueMatch = line.match(/UNIQUE\s*\(([^)]+)\)/i);
        if (uniqueMatch) {
            const cols = uniqueMatch[1].split(',').map(c => c.trim().replace(/["]/g, ''));
            constraints.push({ type: 'unique', columns: cols });
        }
        return;
    }

    // CONSTRAINT con nombre - FOREIGN KEY
    if (line.match(/CONSTRAINT\s+\w+\s+FOREIGN\s+KEY/i)) {
        const fkMatch = line.match(
            /FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+"?(\w+)"?\s*\(([^)]+)\)(?:\s+ON\s+DELETE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION))?(?:\s+ON\s+UPDATE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION))?/i
        );
        if (fkMatch) {
            const onDelete = fkMatch[4] ? fkMatch[4].replace(/\s+/g, ' ').toLowerCase() : null;
            const onUpdate = fkMatch[5] ? fkMatch[5].replace(/\s+/g, ' ').toLowerCase() : null;
            
            constraints.push({
                type: 'foreign',
                column: fkMatch[1].trim().replace(/["]/g, ''),
                references: fkMatch[3].trim().replace(/["]/g, ''),
                on: fkMatch[2].trim(),
                onDelete: onDelete,
                onUpdate: onUpdate
            });
        }
        return;
    }

    // FOREIGN KEY sin CONSTRAINT
    if (line.toUpperCase().includes('FOREIGN KEY')) {
        const fkMatch = line.match(
            /FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+"?(\w+)"?\s*\(([^)]+)\)(?:\s+ON\s+DELETE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION))?(?:\s+ON\s+UPDATE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION))?/i
        );
        if (fkMatch) {
            const onDelete = fkMatch[4] ? fkMatch[4].replace(/\s+/g, ' ').toLowerCase() : null;
            const onUpdate = fkMatch[5] ? fkMatch[5].replace(/\s+/g, ' ').toLowerCase() : null;
            
            constraints.push({
                type: 'foreign',
                column: fkMatch[1].trim().replace(/["]/g, ''),
                references: fkMatch[3].trim().replace(/["]/g, ''),
                on: fkMatch[2].trim(),
                onDelete: onDelete,
                onUpdate: onUpdate
            });
        }
        return;
    }

    // Columna
    const columnMatch = line.match(/^"?(\w+)"?\s+([^\s(]+)(?:\(([^\)]+)\))?(.*)/i);
    if (columnMatch) {
        const [, name, type, lengthPart, rest] = columnMatch;
        const upperRest = (rest || '').toUpperCase();
        const upperType = type.toUpperCase();

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

        const isSerial = upperType.includes('SERIAL') || upperType.includes('BIGSERIAL') || upperType.includes('SMALLSERIAL');
        const hasPrimaryKey = upperRest.includes('PRIMARY KEY');

        const column = {
            name: name,
            type: type,
            length: length,
            precision: precision,
            nullable: !upperRest.includes('NOT NULL') && !hasPrimaryKey,
            primaryKey: hasPrimaryKey,
            autoIncrement: isSerial,
            unique: upperRest.includes('UNIQUE'),
            default: null
        };

        const defaultMatch = rest.match(/DEFAULT\s+([^\s,]+(?:\s+[^\s,]+)?)/i);
        if (defaultMatch) {
            column.default = defaultMatch[1].replace(/['"]/g, '').trim();
        }

        columns.push(column);
    }
}

function mapPostgresTypeToLaravel(col) {
    let baseType = col.type.toLowerCase();

    if ((baseType.includes('serial') || baseType.includes('bigserial')) && col.primaryKey) return 'id';

    if (baseType.includes('bigint') || baseType.includes('bigserial')) return 'bigInteger';
    if (baseType.includes('smallint') || baseType.includes('smallserial')) return 'smallInteger';
    if (baseType.includes('integer') || baseType.includes('serial')) return 'integer';
    
    if (baseType.includes('boolean') || baseType.includes('bool')) return 'boolean';
    
    if (baseType.includes('decimal') || baseType.includes('numeric')) return 'decimal';
    if (baseType.includes('real')) return 'float';
    if (baseType.includes('double')) return 'double';
    
    if (baseType.includes('timestamp')) return 'timestamp';
    if (baseType.includes('date')) return 'date';
    if (baseType.includes('time')) return 'time';

    if (baseType.includes('varchar') || baseType.includes('character varying')) return 'string';
    if (baseType.includes('text')) return 'text';
    if (baseType.includes('char')) return 'char';
    if (baseType.includes('json') || baseType.includes('jsonb')) return 'json';
    if (baseType.includes('uuid')) return 'uuid';

    return 'string';
}

function generatePostgresMigration(table, columns, constraints) {
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
        
        if (fk && !isPartOfCompositePK) {
            const refTable = fk.on;
            const refColumn = fk.references;
            
            if (refColumn === 'id') {
                line += `$table->foreignId('${col.name}')->constrained('${refTable}')`;
                if (fk.onDelete) {
                    const onDeleteFormatted = fk.onDelete.replace(' ', '');
                    line += `->onDelete('${onDeleteFormatted}')`;
                }
                if (fk.onUpdate) {
                    const onUpdateFormatted = fk.onUpdate.replace(' ', '');
                    line += `->onUpdate('${onUpdateFormatted}')`;
                }
                if (col.nullable) line += '->nullable()';
                line += ';';
                out += line + '\n';
                fk.processed = true;
                return;
            }
        }

        const laravelType = mapPostgresTypeToLaravel(col);
        line += `$table->${laravelType}('${col.name}'`;

        if (laravelType === 'string' && col.length) {
            line += `, ${col.length}`;
        }
        if (laravelType === 'char' && col.length) {
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
            const def = col.default.toLowerCase();
            if (def === 'now()' || def === 'current_timestamp') {
                line += `->useCurrent()`;
            } else if (def === 'true') {
                line += '->default(true)';
            } else if (def === 'false') {
                line += '->default(false)';
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
            if (c.onDelete) {
                const onDeleteFormatted = c.onDelete.replace(' ', '');
                fk += `->onDelete('${onDeleteFormatted}')`;
            }
            if (c.onUpdate) {
                const onUpdateFormatted = c.onUpdate.replace(' ', '');
                fk += `->onUpdate('${onUpdateFormatted}')`;
            }
            fk += ';\n';
            out += fk;
        }
    });

    const hasTimestamps = columns.some(c => c.name === 'created_at' || c.name === 'updated_at');
    if (!hasTimestamps) {
        out += `            $table->timestamps();\n`;
    }

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

export function postgresqlToLaravelMigration(sqlInput, tableName = null) {
    const { table, columns, constraints } = processPostgreSql(sqlInput, tableName);
    return generatePostgresMigration(table, columns, constraints);
}
