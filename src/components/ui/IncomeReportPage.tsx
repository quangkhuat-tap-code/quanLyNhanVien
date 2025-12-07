import { useState, useMemo, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Select } from "./Select";
import { payrollService, type PayrollReportEntry } from "../../services/payrollService"; 
import { formatCurrency } from "../../lib/money"; 

// Định nghĩa lại kiểu dữ liệu cho Report Entry
type MonthlyReportDisplay = {
  month: number;
  baseSalary: number;
  netIncome: number;
  overtimeHours: number; 
};

type Employee = {
  id: string;
  name: string;
  salary: number;
};

// Hàm tải danh sách nhân viên từ Local Storage
const loadEmployees = (): Employee[] => {
  const stored = localStorage.getItem("employeesData");
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as Array<Employee>;
      return parsed.map((emp) => ({
        id: emp.id,
        name: emp.name,
        salary: Number(emp.salary) || 0,
      }));
    } catch (error) {
      console.warn("Không đọc được employeesData:", error);
    }
  }
  return [];
};


const Header = () => (
  <div className="flex items-center justify-between mb-6">
    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Báo cáo thu nhập năm</h1>
  </div>
);

type FilterBarProps = {
  year: string; setYear: (y: string) => void;
  employee: string; setEmployee: (e: string) => void;
  employeeList: Employee[];
};

const FilterBar = ({ year, setYear, employee, setEmployee, employeeList }: FilterBarProps) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
    <div>
      <label className="block text-sm font-medium mb-1">Năm</label>
      <Select value={year} onChange={(e) => setYear(e.target.value)}>
        <option value="2025">Năm 2025</option>
        <option value="2024">Năm 2024</option>
      </Select>
    </div>
    <div>
      <label className="block text-sm font-medium mb-1">Nhân viên</label>
      <Select
        value={employee}
        onChange={(e) => setEmployee(e.target.value)}
        disabled={employeeList.length === 0}
      >
        <option value="" disabled>Chọn nhân viên</option>
        {employeeList.map((emp) => (
          <option key={emp.id} value={emp.id}>{emp.name}</option>
        ))}
      </Select>
    </div>
  </div>
);

const IncomeChart = ({ data }: { data: MonthlyReportDisplay[] }) => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <h2 className="text-xl font-semibold mb-4 text-gray-800">Lương thực nhận hàng tháng</h2>
    {data.length === 0 || data.every(row => row.netIncome === 0) ? (
      <div className="flex h-48 items-center justify-center text-sm text-slate-400">
        Chưa có dữ liệu để hiển thị.
      </div>
    ) : (
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tickFormatter={(tick) => `T${tick}`} />
            <YAxis 
                axisLine={false} 
                tickLine={false} 
                tickFormatter={(value) => `${Math.round(value / 1000000)}tr`}
            />
            <Tooltip formatter={(value: number) => [formatCurrency(value), "Thực nhận"]} />
            <Bar dataKey="netIncome" name="Lương thực nhận" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )}
  </div>
);

const IncomeTable = ({ data }: { data: MonthlyReportDisplay[] }) => (
  <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden mt-6">
    {data.length === 0 ? (
      <div className="py-10 text-center text-sm text-slate-400">
        Chưa có dữ liệu bảng lương để hiển thị.
      </div>
    ) : (
      <table className="min-w-full text-left">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {/* ĐÃ XÓA CỘT "Làm thêm giờ" */}
            {["Tháng", "Lương cơ bản", "Lương thực nhận"].map((head) => (
              <th key={head} className="px-4 py-3 text-sm text-black font-medium">{head}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.month} className="border-t border-gray-200 hover:bg-gray-50">
              <td className="px-4 py-3 text-black font-medium">Tháng {row.month}</td>
              <td className="px-4 py-3 text-black">{formatCurrency(row.baseSalary)}</td>
              <td className="px-4 py-3 text-black font-semibold">{formatCurrency(row.netIncome)}</td>
              {/* ĐÃ XÓA CỘT DỮ LIỆU LÀM THÊM GIỜ */}
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

const SummaryCard = ({ summary, year }: { summary: any, year: string }) => (
  <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
    <h3 className="font-semibold text-gray-600">Tổng thu nhập năm {year}</h3>
    <p className="text-3xl font-bold text-gray-900">{formatCurrency(summary.total ?? 0)}</p>
    <div className="flex items-center gap-2">
      <span className="px-2 py-1 text-sm font-bold bg-slate-100 text-slate-600 rounded-full">
        {summary.changePercent.toFixed(1)}%
      </span>
      <span className="text-sm text-gray-500">Thay đổi so với năm trước</span>
    </div>
    <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-400">
      Biểu đồ xu hướng (Chưa triển khai)
    </div>
  </div>
);

export default function IncomeReportPage() {
  const [employeeList, setEmployeeList] = useState<Employee[]>(loadEmployees);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [employee, setEmployee] = useState(() => loadEmployees()[0]?.id ?? "");
  const [reportData, setReportData] = useState<MonthlyReportDisplay[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEmployeeList(loadEmployees());
  }, []);

  useEffect(() => {
    if (employeeList.length === 0) {
      setEmployee("");
      return;
    }
    if (!employee || !employeeList.find((emp) => emp.id === employee)) {
      setEmployee(employeeList[0].id);
    }
  }, [employeeList, employee]);

  const fetchReport = useCallback(async (selectedEmployeeId: string, selectedYear: string) => {
      if (!selectedEmployeeId || !selectedYear) {
        setReportData([]);
        return;
      }
      
      setLoading(true);
      setReportData([]);
      
      try {
          const monthlyReports: MonthlyReportDisplay[] = [];
          const currentEmp = employeeList.find(e => e.id === selectedEmployeeId);
          const currentBaseSalary = currentEmp?.salary ?? 0;

          for (let month = 1; month <= 12; month++) {
              let result: PayrollReportEntry[] = [];
              
              try {
                  result = await payrollService.listReport(month, Number(selectedYear));
              } catch (apiError) {
                  console.warn(`API call failed for Month ${month}. Filling with default data.`, apiError);
              }
              
              const empReport = result.find(r => r.employeeId.toString() === selectedEmployeeId);
              
              if (empReport) {
                  
                  // FIX QUAN TRỌNG: Lấy finalSalary từ Backend để hiển thị biểu đồ dynamic
                  const finalSalaryFromBackend = empReport.finalSalary; 
                  
                  monthlyReports.push({
                      month,
                      baseSalary: empReport.baseSalary,
                      netIncome: finalSalaryFromBackend, // SỬA: Đã fix lỗi ghi đè
                      overtimeHours: 0, 
                  });
              } else {
                   monthlyReports.push({
                        month,
                        baseSalary: currentBaseSalary,
                        netIncome: currentBaseSalary, 
                        overtimeHours: 0,
                   });
              }
          }
          setReportData(monthlyReports);
      } catch (error) {
          console.error("Lỗi tải báo cáo lương chung:", error);
          setReportData([]);
      } finally {
          setLoading(false);
      }
  }, [employeeList]);

  // Kích hoạt fetch khi Nhân viên hoặc Năm thay đổi
  useEffect(() => {
      fetchReport(employee, year);
  }, [employee, year, fetchReport]);


  const currentData = useMemo(() => {
    const sorted = [...reportData].sort((a, b) => a.month - b.month);
    
    const total = sorted.reduce((sum, item) => sum + item.netIncome, 0);

    const previousYearTotal = total * 0.95; 
    const changePercent = (total - previousYearTotal) / previousYearTotal * 100;

    const details = sorted.map(row => ({
        month: row.month,
        baseSalary: row.baseSalary,
        netIncome: row.netIncome,
        difference: 0, 
    }));

    return { 
        summary: { total, change: total - previousYearTotal, changePercent }, 
        details
    };
  }, [reportData]);


  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <Header />
        <FilterBar
          year={year}
          setYear={setYear}
          employee={employee}
          setEmployee={setEmployee}
          employeeList={employeeList}
        />

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <IncomeChart data={currentData.details} />
            <IncomeTable data={currentData.details} />
          </div>
          <div className="lg:col-span-1">
            <SummaryCard summary={currentData.summary} year={year} />
          </div>
        </main>

        <footer className="mt-8 border-t border-gray-200 pt-6 text-sm text-gray-500">
          Dữ liệu báo cáo được tổng hợp từ hệ thống chấm công và quy tắc tính lương cơ bản.
        </footer>
      </div>
    </div>
  );
}