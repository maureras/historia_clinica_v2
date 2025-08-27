import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, Activity, Stethoscope, FileText, 
  Brain, Pill, Save, ChevronLeft, ChevronRight,
  CheckCircle, AlertCircle, Clock, Calendar,
  UserCheck, X, Check, ArrowRight, AlertTriangle
} from 'lucide-react';

import { usePatientsStore } from '@/stores';
import api from '@/lib/api'
import { useToast } from '@/components/ui/ToastNotifications';

// === INTERFACES Y TIPOS ===
interface PadecimientoActualData {
  motivo: string;
  tiempo: string;
  sintomasAsociados: string;
  descripcion: string;
  tratamientoPrevio: string;
}

interface SignosVitalesData {
  temperatura: string;
  presionSistolica: string;
  presionDiastolica: string;
  frecuenciaCardiaca: string;
  frecuenciaRespiratoria: string;
  saturacionOxigeno: string;
  peso: string;
  talla: string;
  imc: string;
  tipoSangre: string;
}

interface ExploracionFisicaData {
  exploracionGeneral: {
    aspectoGeneral: string;
    estadoConciencia: string;
    orientacion: string;
    hidratacion: string;
    coloracion: string;
    constitucion: string;
    actitud: string;
    facies: string;
    marcha: string;
  };
  exploracionSistemas: {
    cabezaCuello: string;
    cardiopulmonar: string;
    abdomen: string;
    extremidades: string;
    neurologico: string;
    piel: string;
    ganglios: string;
    genitourinario: string;
  };
  observacionesGenerales: string;
  fechaExploracion: string;
  exploradoPor: string;
  hallazgosEspecificos: {
    hallazgosNormales: string[];
    hallazgosAnormales: string[];
    impresionClinica: string;
  };
}

interface DiagnosticoData {
  impresionClinica: string;
  principal: string;
  secundarios: string;
  diferencial: string;
  cie10: string;
}

interface TratamientoData {
  medicamentos: string;
  indicaciones: string;
  recomendaciones: string;
  proximaCita: string;
}

// === LABS (MEJORADO) ===
interface LabValueProcessed {
  parameter: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  category?: string; // Ej: "Hematología", "Química", etc.
  isAbnormal?: boolean;
}

interface LaboratorioData {
  archivos: File[];
  resultados: LabValueProcessed[]; // ← Cambiado de any[] a LabValueProcessed[]
  analisis: string;
}

interface ConsultaData {
  id?: string;
  pacienteId: string;
  fecha: string;
  padecimientoActual: PadecimientoActualData | null;
  signosVitales: SignosVitalesData | null;
  exploracionFisica: ExploracionFisicaData | null;
  laboratorios: LaboratorioData | null;
  diagnostico: DiagnosticoData | null;
  tratamiento: TratamientoData | null;
  estado: 'borrador' | 'en_progreso' | 'completada';
  medico: string;
}

interface EtapaConfig {
  id: keyof ConsultaData;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  lightBg: string;
  ringColor: string;
  textColor: string;
  description: string;
  required: string[];
}

// Props interfaces
interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}

interface FormProps<T> {
  data: T | null;
  onChange: (data: T) => void;
  readOnly?: boolean;
}

// === CONFIGURACIÓN DE ETAPAS ===
const ETAPAS_CONSULTA: EtapaConfig[] = [
  {
    id: 'padecimientoActual',
    title: 'Padecimiento Actual',
    icon: AlertTriangle,
    color: 'amber',
    bgColor: 'bg-amber-500',
    lightBg: 'bg-amber-50',
    ringColor: 'ring-amber-200',
    textColor: 'text-amber-700',
    description: 'Motivo de consulta y síntomas actuales',
    required: ['motivo', 'descripcion']
  },
  {
    id: 'signosVitales',
    title: 'Signos Vitales',
    icon: Activity,
    color: 'red',
    bgColor: 'bg-red-500',
    lightBg: 'bg-red-50',
    ringColor: 'ring-red-200',
    textColor: 'text-red-700',
    description: 'Mediciones vitales básicas',
    required: ['temperatura', 'presionSistolica', 'presionDiastolica']
  },
  {
    id: 'exploracionFisica',
    title: 'Exploración Física',
    icon: Stethoscope,
    color: 'blue',
    bgColor: 'bg-blue-500',
    lightBg: 'bg-blue-50',
    ringColor: 'ring-blue-200',
    textColor: 'text-blue-700',
    description: 'Examen físico completo',
    required: []
  },
  {
    id: 'laboratorios',
    title: 'Laboratorios',
    icon: FileText,
    color: 'purple',
    bgColor: 'bg-purple-500',
    lightBg: 'bg-purple-50',
    ringColor: 'ring-purple-200',
    textColor: 'text-purple-700',
    description: 'Estudios complementarios',
    required: []
  },
  {
    id: 'diagnostico',
    title: 'Diagnóstico',
    icon: Brain,
    color: 'emerald',
    bgColor: 'bg-emerald-500',
    lightBg: 'bg-emerald-50',
    ringColor: 'ring-emerald-200',
    textColor: 'text-emerald-700',
    description: 'Evaluación diagnóstica',
    required: ['principal', 'cie10']
  },
  {
    id: 'tratamiento',
    title: 'Tratamiento',
    icon: Pill,
    color: 'indigo',
    bgColor: 'bg-indigo-500',
    lightBg: 'bg-indigo-50',
    ringColor: 'ring-indigo-200',
    textColor: 'text-indigo-700',
    description: 'Plan terapéutico',
    required: ['medicamentos']
  }
];

// === COMPONENTE FORMFIELD ===
const FormField: React.FC<FormFieldProps> = ({ 
  label, 
  value, 
  onChange, 
  multiline = false, 
  rows = 3, 
  placeholder = "", 
  type = "text", 
  disabled = false 
}) => (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-slate-700">{label}</label>
    {multiline ? (
      <textarea
        value={value}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-100 disabled:text-slate-500"
      />
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-100 disabled:text-slate-500"
      />
    )}
  </div>
);

// === FORMULARIO PADECIMIENTO ACTUAL ===
const PadecimientoActualForm: React.FC<FormProps<PadecimientoActualData>> = ({ 
  data, 
  onChange, 
  readOnly = false 
}) => {
  const updateField = (field: keyof PadecimientoActualData, value: string) => {
    const currentData: PadecimientoActualData = data || {
      motivo: '',
      tiempo: '',
      sintomasAsociados: '',
      descripcion: '',
      tratamientoPrevio: ''
    };
    onChange({ ...currentData, [field]: value });
  };

  const safeData = data || {
    motivo: '',
    tiempo: '',
    sintomasAsociados: '',
    descripcion: '',
    tratamientoPrevio: ''
  };

  return (
    <div className="space-y-6">
      {readOnly && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
          <div className="flex items-center gap-2 text-sky-800 text-sm">
            <div className="w-2 h-2 bg-sky-500 rounded-full"></div>
            <span>Complete los datos básicos del paciente antes de continuar.</span>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FormField
          label="Motivo de Consulta"
          value={safeData.motivo}
          onChange={(value: string) => updateField('motivo', value)}
          multiline
          rows={4}
          placeholder="¿Por qué acude el paciente? (Ej: Dolor abdominal, seguimiento, etc.)"
          disabled={readOnly}
        />
        <FormField
          label="Tiempo de Evolución"
          value={safeData.tiempo}
          onChange={(value: string) => updateField('tiempo', value)}
          multiline
          rows={4}
          placeholder="¿Cuándo comenzaron y cómo han evolucionado los síntomas?"
          disabled={readOnly}
        />
      </div>
      
      <FormField
        label="Descripción Detallada del Padecimiento"
        value={safeData.descripcion}
        onChange={(value: string) => updateField('descripcion', value)}
        multiline
        rows={5}
        placeholder="Descripción completa del padecimiento actual, evolución, características..."
        disabled={readOnly}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FormField
          label="Síntomas Asociados"
          value={safeData.sintomasAsociados}
          onChange={(value: string) => updateField('sintomasAsociados', value)}
          multiline
          rows={4}
          placeholder="Fiebre, náuseas, mareos, etc."
          disabled={readOnly}
        />
        <FormField
          label="Tratamiento Previo Recibido"
          value={safeData.tratamientoPrevio}
          onChange={(value: string) => updateField('tratamientoPrevio', value)}
          multiline
          rows={4}
          placeholder="¿Qué tratamientos recibió? ¿Fueron efectivos?"
          disabled={readOnly}
        />
      </div>
    </div>
  );
};

// === FORMULARIO SIGNOS VITALES ===
const SignosVitalesForm: React.FC<FormProps<SignosVitalesData>> = ({ 
  data, 
  onChange, 
  readOnly = false 
}) => {
  const updateField = (field: keyof SignosVitalesData, value: string) => {
    const currentData: SignosVitalesData = data || {
      temperatura: '',
      presionSistolica: '',
      presionDiastolica: '',
      frecuenciaCardiaca: '',
      frecuenciaRespiratoria: '',
      saturacionOxigeno: '',
      peso: '',
      talla: '',
      imc: '',
      tipoSangre: ''
    };
    onChange({ ...currentData, [field]: value });
  };

  const safeData = data || {
    temperatura: '',
    presionSistolica: '',
    presionDiastolica: '',
    frecuenciaCardiaca: '',
    frecuenciaRespiratoria: '',
    saturacionOxigeno: '',
    peso: '',
    talla: '',
    imc: '',
    tipoSangre: ''
  };

  // Cálculo automático de IMC
  useEffect(() => {
    if (safeData.peso && safeData.talla) {
      const peso = parseFloat(safeData.peso);
      const talla = parseFloat(safeData.talla) / 100; // cm a metros
      if (!isNaN(peso) && !isNaN(talla) && talla > 0) {
        const imc = (peso / (talla * talla)).toFixed(1);
        if (imc !== safeData.imc) {
          updateField('imc', imc);
        }
      }
    }
  }, [safeData.peso, safeData.talla]);

  const vitalSignsConfig = [
    { key: 'temperatura' as keyof SignosVitalesData, label: 'Temperatura (°C)', placeholder: '36.5' },
    { key: 'presionSistolica' as keyof SignosVitalesData, label: 'Presión Sistólica (mmHg)', placeholder: '120' },
    { key: 'presionDiastolica' as keyof SignosVitalesData, label: 'Presión Diastólica (mmHg)', placeholder: '80' },
    { key: 'frecuenciaCardiaca' as keyof SignosVitalesData, label: 'Frecuencia Cardíaca (lpm)', placeholder: '75' },
    { key: 'frecuenciaRespiratoria' as keyof SignosVitalesData, label: 'Frecuencia Respiratoria (rpm)', placeholder: '16' },
    { key: 'saturacionOxigeno' as keyof SignosVitalesData, label: 'Saturación de Oxígeno (%)', placeholder: '98' },
    { key: 'peso' as keyof SignosVitalesData, label: 'Peso (kg)', placeholder: '70.5' },
    { key: 'talla' as keyof SignosVitalesData, label: 'Talla (cm)', placeholder: '175' },
  ];

  return (
    <div className="space-y-6">
      {readOnly && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
          <div className="flex items-center gap-2 text-sky-800 text-sm">
            <div className="w-2 h-2 bg-sky-500 rounded-full"></div>
            <span>Complete los datos básicos del paciente antes de registrar signos vitales.</span>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vitalSignsConfig.map(config => (
          <FormField
            key={config.key}
            label={config.label}
            value={safeData[config.key]}
            onChange={(value: string) => updateField(config.key, value)}
            type="number"
            placeholder={config.placeholder}
            disabled={readOnly}
          />
        ))}
        
        <FormField
          label="IMC (kg/m²)"
          value={safeData.imc}
          onChange={() => {}} // Solo lectura
          disabled={true}
          placeholder="Calculado automáticamente"
        />
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Tipo de Sangre</label>
          <select
            value={safeData.tipoSangre}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateField('tipoSangre', e.target.value)}
            disabled={readOnly}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-100 disabled:text-slate-500"
          >
            <option value="">Seleccione tipo</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </select>
        </div>
      </div>
    </div>
  );
};

// === FORMULARIO EXPLORACIÓN FÍSICA ===
const ExploracionFisicaForm: React.FC<FormProps<ExploracionFisicaData>> = ({ 
  data, 
  onChange, 
  readOnly = false 
}) => {
  const updateNestedField = (section: keyof ExploracionFisicaData, field: string, value: string) => {
    const currentData: ExploracionFisicaData = data || {
      exploracionGeneral: {
        aspectoGeneral: '', estadoConciencia: '', orientacion: '',
        hidratacion: '', coloracion: '', constitucion: '',
        actitud: '', facies: '', marcha: ''
      },
      exploracionSistemas: {
        cabezaCuello: '', cardiopulmonar: '', abdomen: '',
        extremidades: '', neurologico: '', piel: '',
        ganglios: '', genitourinario: ''
      },
      observacionesGenerales: '',
      fechaExploracion: '',
      exploradoPor: '',
      hallazgosEspecificos: {
        hallazgosNormales: [],
        hallazgosAnormales: [],
        impresionClinica: ''
      }
    };

    const currentSection = currentData[section] as any;
    
    onChange({
      ...currentData,
      [section]: {
        ...currentSection,
        [field]: value
      }
    });
  };

  const updateField = (field: keyof ExploracionFisicaData, value: string) => {
    const currentData = data || {
      exploracionGeneral: {
        aspectoGeneral: '', estadoConciencia: '', orientacion: '',
        hidratacion: '', coloracion: '', constitucion: '',
        actitud: '', facies: '', marcha: ''
      },
      exploracionSistemas: {
        cabezaCuello: '', cardiopulmonar: '', abdomen: '',
        extremidades: '', neurologico: '', piel: '',
        ganglios: '', genitourinario: ''
      },
      observacionesGenerales: '',
      fechaExploracion: '',
      exploradoPor: '',
      hallazgosEspecificos: {
        hallazgosNormales: [],
        hallazgosAnormales: [],
        impresionClinica: ''
      }
    };

    onChange({ ...currentData, [field]: value });
  };

  const safeData = data || {
    exploracionGeneral: {
      aspectoGeneral: '', estadoConciencia: '', orientacion: '',
      hidratacion: '', coloracion: '', constitucion: '',
      actitud: '', facies: '', marcha: ''
    },
    exploracionSistemas: {
      cabezaCuello: '', cardiopulmonar: '', abdomen: '',
      extremidades: '', neurologico: '', piel: '',
      ganglios: '', genitourinario: ''
    },
    observacionesGenerales: '',
    fechaExploracion: '',
    exploradoPor: '',
    hallazgosEspecificos: {
      hallazgosNormales: [],
      hallazgosAnormales: [],
      impresionClinica: ''
    }
  };

  return (
    <div className="space-y-6">
      {readOnly && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
          <div className="flex items-center gap-2 text-sky-800 text-sm">
            <div className="w-2 h-2 bg-sky-500 rounded-full"></div>
            <span>Complete los datos básicos del paciente antes de registrar la exploración física.</span>
          </div>
        </div>
      )}
      
      <section className="space-y-4">
        <h4 className="text-lg font-semibold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-200">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          Exploración General
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Aspecto General"
            value={safeData.exploracionGeneral.aspectoGeneral}
            onChange={(value: string) => updateNestedField('exploracionGeneral', 'aspectoGeneral', value)}
            multiline
            rows={3}
            placeholder="Paciente en buen/mal estado general..."
            disabled={readOnly}
          />
          <FormField
            label="Estado de Conciencia"
            value={safeData.exploracionGeneral.estadoConciencia}
            onChange={(value: string) => updateNestedField('exploracionGeneral', 'estadoConciencia', value)}
            multiline
            rows={3}
            placeholder="Consciente, alerta, orientado..."
            disabled={readOnly}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h4 className="text-lg font-semibold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-200">
          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
          Exploración por Sistemas
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Cardiopulmonar"
            value={safeData.exploracionSistemas.cardiopulmonar}
            onChange={(value: string) => updateNestedField('exploracionSistemas', 'cardiopulmonar', value)}
            multiline
            rows={4}
            placeholder="Ruidos cardíacos, campos pulmonares..."
            disabled={readOnly}
          />
          <FormField
            label="Abdomen"
            value={safeData.exploracionSistemas.abdomen}
            onChange={(value: string) => updateNestedField('exploracionSistemas', 'abdomen', value)}
            multiline
            rows={4}
            placeholder="Inspección, auscultación, palpación..."
            disabled={readOnly}
          />
        </div>
      </section>

      <FormField
        label="Observaciones Generales"
        value={safeData.observacionesGenerales}
        onChange={(value: string) => updateField('observacionesGenerales', value)}
        multiline
        rows={4}
        placeholder="Observaciones adicionales relevantes..."
        disabled={readOnly}
      />
    </div>
  );
};

// === FORMULARIO LABORATORIOS (MEJORADO) ===
const LaboratoriosFormMejorado: React.FC<FormProps<LaboratorioData>> = ({
  data,
  onChange,
  readOnly = false,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [parsing, setParsing] = useState(false)
  const { patientId } = useParams();
  const toastLocal = useToast();

  // Helper para unir resultados únicos por parámetro y categoría
  const mergeUniqueResults = (base: LabValueProcessed[], extra: LabValueProcessed[]) => {
    const seen = new Set(base.map(b => `${(b.category || '')}::${b.parameter.toLowerCase()}`));
    const merged = [...base];
    for (const e of extra) {
      const key = `${(e.category || '')}::${e.parameter.toLowerCase()}`;
      if (!seen.has(key)) merged.push(e);
    }
    return merged;
  };

  useEffect(() => {
    // Inicializar estado local desde data
    if (data?.archivos?.length) setSelectedFiles(data.archivos)
  }, [data?.archivos])

  const setResultados = (res: LabValueProcessed[]) => {
    const payload: LaboratorioData = {
      archivos: selectedFiles,
      resultados: res,
      analisis: data?.analisis || '',
    }
    onChange(payload)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setSelectedFiles(files)

    // Actualizar inmediatamente en el onChange
    onChange({ archivos: files, resultados: data?.resultados || [], analisis: data?.analisis || '' })

    // Intentar extraer texto y parsear (solo para previsualización; no sobrescribe resultados del backend)
    setParsing(true);
    try {
      const texts = await Promise.all(files.map(f => extractTextFromPDF(f)));
      const mergedTxt = texts.join('\n');
      const parsedLocal = parseLabValues(mergedTxt);

      if (parsedLocal.length > 0) {
        const actuales = (data?.resultados || []);
        const combinados = mergeUniqueResults(actuales, parsedLocal);
        onChange({ archivos: files, resultados: combinados, analisis: data?.analisis || '' });
      }
    } catch (err) {
      console.error('Error procesando archivos de laboratorio:', err);
    } finally {
      setParsing(false);
    }
  }

  const grouped = (data?.resultados || []).reduce<Record<string, LabValueProcessed[]>>((acc, cur) => {
    const key = cur.category || 'Otros'
    acc[key] = acc[key] || []
    acc[key].push(cur)
    return acc
  }, {})

  const handleAnalisisChange = (v: string) => {
    onChange({ archivos: selectedFiles, resultados: data?.resultados || [], analisis: v })
  }

  const handleAnalyzeNow = async (filesArg?: File[]) => {
    try {
      const filesToUse = filesArg && filesArg.length ? filesArg : selectedFiles;
      if (!patientId) {
        toastLocal.error('Paciente faltante', 'No se encontró el ID de paciente en la ruta.');
        return;
      }
      if (!filesToUse.length) {
        toastLocal.warning('Sin archivos', 'Selecciona al menos un archivo de laboratorio.');
        return;
      }
      setParsing(true);
      const form = new FormData();
      form.append('patientId', String(patientId));
      filesToUse.forEach((f) => form.append('files', f));

      const { data: labCreated } = await api.post('/api/labs/analyze', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const valores = Array.isArray(labCreated?.values) ? labCreated.values : [];
      const analisis = labCreated?.resumen_hallazgos || labCreated?.resumen || '';

      onChange({
        archivos: filesToUse,
        resultados: valores.map((v: any) => ({
          parameter: v.prueba || v.parameter || '',
          value: v.valor ?? v.value ?? '',
          unit: v.unidad ?? v.unit ?? '',
          referenceRange: v.rango ?? v.referenceRange ?? '',
          category: v.categoria ?? v.category ?? '',
          isAbnormal: !!(v.flag && /alto|alta|bajo|baja|elevad|disminuid|abnormal|fuera/i.test(String(v.flag))),
        })),
        analisis,
      });

      toastLocal.success('🧪 Laboratorio procesado', 'Resultados analizados y mostrados.');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'No se pudo analizar el laboratorio';
      toastLocal.error('Error al analizar', msg);
      console.error('[LaboratoriosFormMejorado] analyze now error:', err);
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center py-12 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50">
        <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Subir Resultados de Laboratorio</h3>
        <p className="text-slate-600 mb-6">Adjunta PDFs o imágenes con los resultados</p>

        {!readOnly && (
          <div>
            <input
              id="lab-files-adv"
              name="files"
              aria-label="Archivos de laboratorio"
              type="file"
              multiple
              accept=".pdf,image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex items-center justify-center gap-3">
              <label
                htmlFor="lab-files-adv"
                className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-700 cursor-pointer transition-colors"
              >
                <FileText className="w-4 h-4" />
                Seleccionar Archivos
              </label>
              <button
                type="button"
                onClick={() => handleAnalyzeNow()}
                disabled={parsing || selectedFiles.length === 0}
                className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Enviar a análisis con IA"
              >
                <Brain className="w-4 h-4" />
                Analizar ahora
              </button>
            </div>
            {parsing && (
              <div className="mt-3 text-sm text-slate-600">Procesando y analizando resultados…</div>
            )}
          </div>
        )}
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-slate-900">Archivos:</h4>
          {selectedFiles.map((file, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium">{file.name}</span>
                <span className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {(data?.analisis && data.analisis.trim().length > 0) && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50">
          <div className="text-sm text-emerald-800">
            <strong>Resumen IA:</strong> {data.analisis}
          </div>
        </div>
      )}

      {/* Tabla de resultados agrupados */}
      {(data?.resultados && data.resultados.length > 0) && (
        <div className="space-y-6">
          {Object.entries(grouped).map(([categoria, items]) => (
            <div key={categoria} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800">{categoria}</span>
                <span className="text-xs text-slate-500">{items.length} parámetros</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">Parámetro</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">Valor</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">Unidades</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">Referencia</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">Bandera</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {items.map((r, i) => (
                      <tr key={i} className={r.isAbnormal ? 'bg-amber-50' : ''}>
                        <td className="px-4 py-2 text-slate-800">{r.parameter}</td>
                        <td className="px-4 py-2 text-slate-800">{r.value}</td>
                        <td className="px-4 py-2 text-slate-600">{r.unit || '—'}</td>
                        <td className="px-4 py-2 text-slate-600">{r.referenceRange || '—'}</td>
                        <td className="px-4 py-2">
                          {r.isAbnormal ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Fuera de rango</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Normal</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Análisis / Observaciones */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">Análisis e Interpretación</label>
        <textarea
          value={data?.analisis || ''}
          onChange={(e) => handleAnalisisChange(e.target.value)}
          rows={4}
          placeholder="Resumen de hallazgos, correlación clínica y plan sugerido…"
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
        />
      </div>


    </div>
  )
}

// ===== Helpers de parsing y extracción =====
async function extractTextFromPDF(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const arr = new Uint8Array(ev.target?.result as ArrayBuffer)
        if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
          const pdf = await (window as any).pdfjsLib.getDocument({ data: arr }).promise
          let full = ''
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i)
            const textContent = await page.getTextContent()
            const pageText = (textContent.items as any[]).map((it: any) => it.str).join(' ')
            full += pageText + '\n'
          }
          resolve(full)
        } else {
          console.warn('PDF.js no está disponible en el cliente; omitiendo extracción de texto en frontend.')
          resolve('')
        }
      } catch (e) {
        reject(e)
      }
    }
    reader.onerror = () => reject(new Error('Error al leer el archivo'))
    reader.readAsArrayBuffer(file)
  })
}

function parseLabValues(text: string): LabValueProcessed[] {
  const lines = text.split(/\n|\r/).map(l => l.trim()).filter(Boolean)
  const results: LabValueProcessed[] = []
  let currentCategory: string | undefined

  const headerRx = /^(HEMATOLOGIA|HEMATOLOGÍA|QUIMICA|QUÍMICA|BIOQUIMICA|BIOQUÍMICA|INMUNOLOGIA|INMUNOLOGÍA|COAGULACION|COAGULACIÓN|MICROBIOLOGIA|MICROBIOLOGÍA|ORINA|ANÁLISIS DE ORINA|GASOMETRIA|GASOMETRÍA)/i
  const valueRx = /^(.*?):\s*([^\s]+(?:\s*[^\(]*?)?)\s*(?:([a-zA-Z%\/\^\d\.\-\*]+))?\s*(?:\(([^\)]*)\))?$/

  for (const line of lines) {
    // Detectar cabeceras de categoría
    if (headerRx.test(line)) {
      currentCategory = line.replace(/:$/, '')
      continue
    }

    // Intentar extraer: Parámetro: valor [unidad] (rango)
    const m = line.match(valueRx)
    if (m) {
      const parameter = m[1].trim()
      const rawValue = m[2].trim()
      const unit = m[3]?.trim()
      const range = m[4]?.trim()
      const category = currentCategory || categorizeParameter(parameter)
      const isAbn = isAbnormal(rawValue, range)
      results.push({ parameter, value: rawValue, unit, referenceRange: range, category, isAbnormal: isAbn })
      continue
    }

    // Patrones adicionales (ejemplos)
    const additionalPatterns = [
      /^([^:]+):\s*(Positivo|Negativo|Trazas|[+-]{1,4})$/i,
      /^(Cultivo[^:]*|Microorganismo[^:]*):\s*([A-Za-z\s]+)$/i,
    ]
    for (const rx of additionalPatterns) {
      const mm = line.match(rx)
      if (mm) {
        const parameter = mm[1].trim()
        const value = mm[2].trim()
        const category = currentCategory || categorizeParameter(parameter)
        results.push({ parameter, value, category })
        break
      }
    }
  }

  return results
}

function categorizeParameter(param: string): string {
  const p = param.toLowerCase()
  if (/(hemo|hemato|eritro|leuco|plaqueta|vcm|hcm|hb)/.test(p)) return 'Hematología'
  if (/(glucosa|urea|creatinina|colesterol|hdl|ldl|triglic|tgo|tgp|alt|ast|bilirrubina|sodio|potasio|cloro|calcio)/.test(p)) return 'Química Clínica'
  if (/(tsh|t3|t4|hormona|fsh|lh|prolactina)/.test(p)) return 'Endocrinología'
  if (/(proteinas|glucosa urinaria|sedimento|nitritos|leucocitos esterasas)/.test(p)) return 'Análisis de Orina'
  if (/(cultivo|antibiograma|gram|microorganismo)/.test(p)) return 'Microbiología'
  return 'Otros'
}

function isAbnormal(value: string, ref?: string): boolean {
  if (!ref) return false
  // Extraer números básicos del rango: "70 - 99" o "< 200" o "> 40"
  const v = parseFloat(value.replace(/,/g, '.'))
  if (isNaN(v)) return false

  const between = ref.match(/(\d+[\.,]?\d*)\s*[-–]\s*(\d+[\.,]?\d*)/)
  if (between) {
    const low = parseFloat(between[1].replace(/,/g, '.'))
    const high = parseFloat(between[2].replace(/,/g, '.'))
    return v < low || v > high
  }

  const less = ref.match(/<\s*(\d+[\.,]?\d*)/)
  if (less) {
    const max = parseFloat(less[1].replace(/,/g, '.'))
    return v >= max
  }

  const greater = ref.match(/>\s*(\d+[\.,]?\d*)/)
  if (greater) {
    const min = parseFloat(greater[1].replace(/,/g, '.'))
    return v <= min
  }

  return false
}

// === FORMULARIO LABORATORIOS ===
const LaboratoriosForm: React.FC<FormProps<LaboratorioData>> = ({ 
  data, 
  onChange, 
  readOnly = false 
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
    
    if (data) {
      onChange({ ...data, archivos: files });
    } else {
      onChange({ 
        archivos: files, 
        resultados: [], 
        analisis: '' 
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center py-12 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50">
        <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Subir Resultados de Laboratorio</h3>
        <p className="text-slate-600 mb-6">Seleccione archivos PDF con los resultados de laboratorio</p>
        
        {!readOnly && (
          <div>
            <input
              type="file"
              multiple
              accept=".pdf,image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="lab-files"
            />
            <label
              htmlFor="lab-files"
              className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-700 cursor-pointer transition-colors"
            >
              <FileText className="w-4 h-4" />
              Seleccionar Archivos
            </label>
          </div>
        )}
      </div>
      
      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-slate-900">Archivos seleccionados:</h4>
          {selectedFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium">{file.name}</span>
                <span className="text-xs text-slate-500">
                  {(file.size / 1024).toFixed(0)} KB
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="p-4 bg-sky-50 border border-sky-200 rounded-lg">
        <p className="text-sm text-sky-800">
          <strong>Nota:</strong> Los archivos de laboratorio serán procesados automáticamente con IA para extraer los resultados y identificar valores fuera de rango.
        </p>
      </div>
    </div>
  );
};

// === FORMULARIO DIAGNÓSTICO ===
const DiagnosticoForm: React.FC<FormProps<DiagnosticoData>> = ({ 
  data, 
  onChange, 
  readOnly = false 
}) => {
  const updateField = (field: keyof DiagnosticoData, value: string) => {
    const currentData = data || {
      impresionClinica: '',
      principal: '',
      secundarios: '',
      diferencial: '',
      cie10: ''
    };
    onChange({ ...currentData, [field]: value });
  };

  const safeData = data || {
    impresionClinica: '',
    principal: '',
    secundarios: '',
    diferencial: '',
    cie10: ''
  };

  return (
    <div className="space-y-6">
      <FormField
        label="Diagnóstico Principal"
        value={safeData.principal}
        onChange={(value: string) => updateField('principal', value)}
        multiline
        rows={4}
        placeholder="Diagnóstico más probable basado en la evidencia clínica"
        disabled={readOnly}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FormField
          label="Diagnósticos Secundarios"
          value={safeData.secundarios}
          onChange={(value: string) => updateField('secundarios', value)}
          multiline
          rows={4}
          placeholder="Comorbilidades y condiciones adicionales"
          disabled={readOnly}
        />
        <FormField
          label="Diagnóstico Diferencial"
          value={safeData.diferencial}
          onChange={(value: string) => updateField('diferencial', value)}
          multiline
          rows={4}
          placeholder="Otras posibilidades diagnósticas a considerar"
          disabled={readOnly}
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FormField
          label="Código CIE-10"
          value={safeData.cie10}
          onChange={(value: string) => updateField('cie10', value)}
          placeholder="Ej: I10 - Hipertensión esencial"
          disabled={readOnly}
        />
        <FormField
          label="Impresión Clínica"
          value={safeData.impresionClinica}
          onChange={(value: string) => updateField('impresionClinica', value)}
          multiline
          rows={4}
          placeholder="Resumen de la evaluación clínica"
          disabled={readOnly}
        />
      </div>
    </div>
  );
};

// === FORMULARIO TRATAMIENTO ===
const TratamientoForm: React.FC<FormProps<TratamientoData>> = ({ 
  data, 
  onChange, 
  readOnly = false 
}) => {
  const updateField = (field: keyof TratamientoData, value: string) => {
    const currentData = data || {
      medicamentos: '',
      indicaciones: '',
      recomendaciones: '',
      proximaCita: ''
    };
    onChange({ ...currentData, [field]: value });
  };

  const safeData = data || {
    medicamentos: '',
    indicaciones: '',
    recomendaciones: '',
    proximaCita: ''
  };

  return (
    <div className="space-y-6">
      <FormField
        label="Prescripción Farmacológica"
        value={safeData.medicamentos}
        onChange={(value: string) => updateField('medicamentos', value)}
        multiline
        rows={5}
        placeholder="Ej: Losartán 50mg VO c/24h #30 tabletas..."
        disabled={readOnly}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FormField
          label="Indicaciones Médicas"
          value={safeData.indicaciones}
          onChange={(value: string) => updateField('indicaciones', value)}
          multiline
          rows={5}
          placeholder="Reposo relativo, dieta blanda, aplicar calor local..."
          disabled={readOnly}
        />
        <FormField
          label="Recomendaciones y Educación"
          value={safeData.recomendaciones}
          onChange={(value: string) => updateField('recomendaciones', value)}
          multiline
          rows={5}
          placeholder="Mantener hidratación, evitar automedicación..."
          disabled={readOnly}
        />
      </div>
      
      <FormField
        label="Plan de Seguimiento y Próxima Cita"
        value={safeData.proximaCita}
        onChange={(value: string) => updateField('proximaCita', value)}
        multiline
        rows={4}
        placeholder="Control en 7 días para reevaluación..."
        disabled={readOnly}
      />
    </div>
  );
};

// === COMPONENTE PRINCIPAL ===
const NewConsultation: React.FC = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { patients, fetchPatients } = usePatientsStore();
  useEffect(() => { if (!patients || patients.length === 0) fetchPatients(); }, [patients, fetchPatients]);
  const paciente = patients?.find(p => p.id === (patientId as string));
  const toast = useToast();
  const [etapaActual, setEtapaActual] = useState<number>(0);
  const [consulta, setConsulta] = useState<ConsultaData>({
    pacienteId: (patientId as string) || '',
    fecha: new Date().toISOString().split('T')[0],
    padecimientoActual: null,
    signosVitales: null,
    exploracionFisica: null,
    laboratorios: null,
    diagnostico: null,
    tratamiento: null,
    estado: 'completada',
    medico: 'Dr. Juan Pérez'
  });
  const [isGuardando, setIsGuardando] = useState<boolean>(false);
  const [mostrarResumen, setMostrarResumen] = useState<boolean>(false);

  useEffect(() => {
    setConsulta(prev => ({ ...prev, pacienteId: (patientId as string) || '' }));
  }, [patientId]);

  // Evaluar completitud de cada etapa
  const evaluarCompletitud = (etapaId: keyof ConsultaData): boolean => {
    const etapa = ETAPAS_CONSULTA.find(e => e.id === etapaId);
    if (!etapa) return false;
    
    const data = consulta[etapaId];
    if (!data) return false;
    
    return etapa.required.every((campo: string) => {
      if (campo.includes('.')) {
        const [seccion, subcampo] = campo.split('.');
        return (data as any)[seccion] && (data as any)[seccion][subcampo];
      }
      return (data as any)[campo];
    });
  };

  const actualizarDatos = (etapa: keyof ConsultaData, datos: any) => {
    setConsulta(prev => ({ ...prev, [etapa]: datos }));
  };

  const siguiente = () => {
    if (etapaActual < ETAPAS_CONSULTA.length - 1) {
      setEtapaActual(etapaActual + 1);
    }
  };

  const anterior = () => {
    if (etapaActual > 0) {
      setEtapaActual(etapaActual - 1);
    }
  };

  const irAEtapa = (indice: number) => {
    setEtapaActual(indice);
  };

  const guardarConsulta = async () => {
    setIsGuardando(true);
    try {
      if (!patientId) {
        toast.error('Paciente faltante', 'No se encontró el ID de paciente en la ruta.');
        return;
      }
      // Construimos el payload que espera el backend
      const payload = {
        patientId: patientId as string,                 // 👈 nombre correcto para la API
        fecha: (consulta.fecha || new Date().toISOString().split('T')[0]),
        medico: consulta.medico,
        estado: 'completada',
        motivo: consulta.padecimientoActual?.motivo || '',
        resumen: consulta.diagnostico?.impresionClinica || '',
        // Mapeo a la forma que ya usa el timeline (presion/fc/spo2)
        signosVitales: consulta.signosVitales
          ? {
              presion:
                consulta.signosVitales.presionSistolica &&
                consulta.signosVitales.presionDiastolica
                  ? `${consulta.signosVitales.presionSistolica}/${consulta.signosVitales.presionDiastolica}`
                  : undefined,
              fc: consulta.signosVitales.frecuenciaCardiaca || undefined,
              spo2: consulta.signosVitales.saturacionOxigeno
                ? `${consulta.signosVitales.saturacionOxigeno}%`
                : undefined,
              temperatura: consulta.signosVitales.temperatura || undefined,
              fr: consulta.signosVitales.frecuenciaRespiratoria || undefined,
            }
          : undefined,
        // Campos JSON opcionales (el backend los serializa a TEXT si es necesario)
        padecimientoActual: consulta.padecimientoActual ?? undefined,
        exploracionFisica: consulta.exploracionFisica ?? undefined,
        diagnostico: consulta.diagnostico ?? undefined,
        tratamiento: consulta.tratamiento ?? undefined,
      };

      // 1) Crear la consulta (JSON) y obtener su ID
      const { data: created } = await api.post('/api/consultations', payload);
      const consultationId: string | undefined = created?.id;

      // 2) Si hay archivos de laboratorio, subirlos a /api/labs/analyze
      const files: File[] = (consulta.laboratorios?.archivos as File[] | undefined) ?? [];
      if (files.length > 0) {
        const form = new FormData();
        form.append('patientId', patientId as string);
        if (consultationId) form.append('consultationId', consultationId);
        // Podemos usar la misma fecha de la consulta como fechaInforme si no se especifica
        if (consulta?.fecha) form.append('fechaInforme', consulta.fecha);

        files.forEach((f) => form.append('files', f));

        try {
          await api.post('/api/labs/analyze', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          toast.success('🧪 Laboratorio procesado', 'Se analizaron y guardaron los resultados del laboratorio.');
        } catch (labErr: any) {
          const lmsg =
            labErr?.response?.data?.message ||
            labErr?.message ||
            'No se pudieron procesar los archivos de laboratorio';
          // Notificamos pero no bloqueamos el guardado de la consulta
          toast.warning('Laboratorio no procesado', lmsg);
          console.error('[NewConsultation] POST /api/labs/analyze error:', labErr);
        }
      }

      toast.success('✅ Consulta guardada', 'La consulta se registró correctamente.');
      // Volver a la historia clínica del paciente para ver el timeline actualizado
      navigate(`/records/medical/${patientId}`);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'No se pudo guardar la consulta';
      toast.error('Error al guardar', msg);
      console.error('[NewConsultation] POST /api/consultations error:', err);
    } finally {
      setIsGuardando(false);
    }
  };

  const etapaActualConfig = ETAPAS_CONSULTA[etapaActual];
  const IconoEtapa = etapaActualConfig.icon;
  const totalCompletadas = ETAPAS_CONSULTA.filter(e => evaluarCompletitud(e.id)).length;
  const porcentajeProgreso = (totalCompletadas / ETAPAS_CONSULTA.length) * 100;

  const renderFormulario = () => {
    const readOnly = false; // En una implementación real, esto vendría del estado del paciente
    
    switch (etapaActual) {
      case 0:
        return (
          <PadecimientoActualForm
            data={consulta.padecimientoActual}
            onChange={(datos: PadecimientoActualData) => actualizarDatos('padecimientoActual', datos)}
            readOnly={readOnly}
          />
        );
      case 1:
        return (
          <SignosVitalesForm
            data={consulta.signosVitales}
            onChange={(datos: SignosVitalesData) => actualizarDatos('signosVitales', datos)}
            readOnly={readOnly}
          />
        );
      case 2:
        return (
          <ExploracionFisicaForm
            data={consulta.exploracionFisica}
            onChange={(datos: ExploracionFisicaData) => actualizarDatos('exploracionFisica', datos)}
            readOnly={readOnly}
          />
        );
      case 3:
        return (
          <LaboratoriosFormMejorado
            data={consulta.laboratorios}
            onChange={(datos: LaboratorioData) => actualizarDatos('laboratorios', datos)}
            readOnly={readOnly}
          />
        );
      case 4:
        return (
          <DiagnosticoForm
            data={consulta.diagnostico}
            onChange={(datos: DiagnosticoData) => actualizarDatos('diagnostico', datos)}
            readOnly={readOnly}
          />
        );
      case 5:
        return (
          <TratamientoForm
            data={consulta.tratamiento}
            onChange={(datos: TratamientoData) => actualizarDatos('tratamiento', datos)}
            readOnly={readOnly}
          />
        );
      default:
        return <div>Etapa no encontrada</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-indigo-50">
      <div className="max-w-7xl mx-auto p-6">
        
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-6 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500" />
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-1">Nueva Consulta Médica</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  {paciente ? (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium text-slate-900">{paciente.firstName} {paciente.lastName}</span>
                      {paciente.documentType || paciente.documentNumber ? <span className="text-slate-400">•</span> : null}
                      {paciente.documentType || paciente.documentNumber ? (
                        <span className="inline-flex items-center gap-1 text-slate-700">
                          <span className="capitalize">{paciente.documentType || '—'}</span>
                          <span>{paciente.documentNumber || '—'}</span>
                        </span>
                      ) : null}
                      {paciente.email ? <span className="text-slate-400">•</span> : null}
                      {paciente.email ? <span>{paciente.email}</span> : null}
                      {paciente.phone ? <span className="text-slate-400">•</span> : null}
                      {paciente.phone ? <span>{paciente.phone}</span> : null}
                      {paciente.bloodType ? (
                        <span className="text-slate-400">•</span>
                      ) : null}
                      {paciente.bloodType ? (
                        <span className="px-2 py-0.5 rounded-full border text-xs bg-cyan-50 text-cyan-700 border-cyan-200">{paciente.bloodType}</span>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-slate-700">Paciente: {consulta.pacienteId || '—'}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Fecha: {consulta.fecha}
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Médico: {consulta.medico}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-center">
              </div>
              <button
                onClick={() => setMostrarResumen(!mostrarResumen)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                {mostrarResumen ? 'Ocultar' : 'Ver'} Resumen
              </button>
              <button
                onClick={guardarConsulta}
                disabled={isGuardando}
                className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                <Save className="w-4 h-4" />
                {isGuardando ? 'Guardando...' : 'Guardar Consulta'}
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            {ETAPAS_CONSULTA.map((etapa, index) => {
              const completada = evaluarCompletitud(etapa.id);
              const actual = index === etapaActual;
              const IconoEtapaLocal = etapa.icon;
              
              return (
                <div key={etapa.id} className="flex flex-col items-center flex-1">
                  <button
                    onClick={() => irAEtapa(index)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all transform hover:scale-105 ${
                      actual 
                        ? `${etapa.bgColor} text-white shadow-lg ring-4 ring-opacity-30 ${etapa.ringColor}` 
                        : completada
                        ? 'bg-emerald-500 text-white shadow-md'
                        : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                    }`}
                  >
                    {completada && !actual ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <IconoEtapaLocal className="w-6 h-6" />
                    )}
                  </button>
                  <span className={`text-xs font-medium text-center max-w-20 leading-tight ${
                    actual ? 'text-slate-900' : 'text-slate-600'
                  }`}>
                    {etapa.title}
                  </span>
                </div>
              );
            })}
          </div>
          
          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-sky-500 to-indigo-500 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${porcentajeProgreso}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-2 text-sm text-slate-600">
            <span>Progreso: {porcentajeProgreso.toFixed(0)}%</span>
            <span>Etapa {etapaActual + 1} de {ETAPAS_CONSULTA.length}</span>
          </div>
        </div>

        {/* Resumen (condicional) */}
        {mostrarResumen && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Resumen de la Consulta</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ETAPAS_CONSULTA.map((etapa) => {
                const completada = evaluarCompletitud(etapa.id);
                const IconoEtapa = etapa.icon;
                
                return (
                  <div key={etapa.id} className={`p-4 rounded-xl border ${
                    completada 
                      ? `${etapa.lightBg} border-${etapa.color}-200` 
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-8 h-8 rounded-lg ${
                        completada ? etapa.bgColor : 'bg-slate-400'
                      } text-white flex items-center justify-center`}>
                        <IconoEtapa className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-slate-900">{etapa.title}</span>
                      {completada && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                    </div>
                    <p className="text-xs text-slate-600">{etapa.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Contenido Principal */}
        <div className={`rounded-2xl shadow-lg border border-slate-200 p-6 mb-6 ring-1 ${etapaActualConfig.ringColor} ${etapaActualConfig.lightBg}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-10 h-10 rounded-xl ${etapaActualConfig.bgColor} text-white flex items-center justify-center`}>
              <IconoEtapa className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{etapaActualConfig.title}</h2>
              <p className="text-slate-600">{etapaActualConfig.description}</p>
            </div>
            {evaluarCompletitud(etapaActualConfig.id) && (
              <div className="ml-auto flex items-center gap-2 text-emerald-600 text-sm font-medium">
                <CheckCircle className="w-5 h-5" />
                Completado
              </div>
            )}
          </div>

          <div className="min-h-96">
            {renderFormulario()}
          </div>
        </div>

        {/* Navegación */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-500" />
          <div className="flex items-center justify-between">
            <button
              onClick={anterior}
              disabled={etapaActual === 0}
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>

            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">
                Etapa {etapaActual + 1} de {ETAPAS_CONSULTA.length}
              </span>
              {evaluarCompletitud(etapaActualConfig.id) ? (
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Completado</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-600">
                  <Clock className="w-5 h-5" />
                  <span className="text-sm font-medium">Pendiente</span>
                </div>
              )}
            </div>

            <button
              onClick={siguiente}
              disabled={etapaActual === ETAPAS_CONSULTA.length - 1}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewConsultation;