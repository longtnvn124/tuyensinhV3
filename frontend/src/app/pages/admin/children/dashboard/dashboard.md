# Dashboard Thống kê Tổng quan

> File HTML thuần — sử dụng CSS variables của theme hiện tại (primary: #4680ff).  
> Sau này sẽ thay dữ liệu tĩnh bằng API calls.

```html
<!-- ============================================================ -->
<!-- DASHBOARD THỐNG KÊ TUYỂN SINH                                  -->
<!-- ============================================================ -->
<div class="dash-container blue-theme">

    <!-- ======== HEADER ======== -->
    <div class="dash-header">
        <div>
            <h1 class="dash-title">Tổng quan tuyển sinh</h1>
            <p class="dash-subtitle">Dữ liệu cập nhật đến hôm nay · <span class="text-primary-500" id="lastUpdate">07/07/2026</span></p>
        </div>
        <div class="dash-header-actions">
            <select class="dash-select" id="periodSelect">
                <option value="7">7 ngày</option>
                <option value="30" selected>30 ngày</option>
                <option value="90">90 ngày</option>
                <option value="365">Năm nay</option>
            </select>
            <button class="dash-btn dash-btn-primary" onclick="window.location.reload()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
                Làm mới
            </button>
        </div>
    </div>

    <!-- ======== ROW 1: KPI CARDS ======== -->
    <div class="row">
        <div class="col-xl-3 col-md-6">
            <div class="kpi-card">
                <div class="kpi-icon kpi-icon--blue">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div class="kpi-body">
                    <span class="kpi-label">Tổng hồ sơ</span>
                    <span class="kpi-value" id="totalRegistrations">--</span>
                    <span class="kpi-change kpi-change--up">+12.5%</span>
                </div>
            </div>
        </div>
        <div class="col-xl-3 col-md-6">
            <div class="kpi-card">
                <div class="kpi-icon kpi-icon--yellow">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <div class="kpi-body">
                    <span class="kpi-label">Doanh thu (VNĐ)</span>
                    <span class="kpi-value" id="totalRevenue">--</span>
                    <span class="kpi-change kpi-change--up">+8.3%</span>
                </div>
            </div>
        </div>
        <div class="col-xl-3 col-md-6">
            <div class="kpi-card">
                <div class="kpi-icon kpi-icon--green">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <div class="kpi-body">
                    <span class="kpi-label">Trúng tuyển</span>
                    <span class="kpi-value" id="totalAdmitted">--</span>
                    <span class="kpi-change kpi-change--up">+5.2%</span>
                </div>
            </div>
        </div>
        <div class="col-xl-3 col-md-6">
            <div class="kpi-card">
                <div class="kpi-icon kpi-icon--red">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                </div>
                <div class="kpi-body">
                    <span class="kpi-label">Hồ sơ chờ xử lý</span>
                    <span class="kpi-value" id="pendingRegistrations">--</span>
                    <span class="kpi-change kpi-change--down">-2.1%</span>
                </div>
            </div>
        </div>
    </div>

    <!-- ======== ROW 2: CHARTS ======== -->
    <div class="row">
        <div class="col-lg-8">
            <div class="card">
                <div class="card-header">
                    <h3>Hồ sơ theo ngành học</h3>
                    <div class="card-actions">
                        <span class="badge badge--primary">Theo đợt hiện tại</span>
                    </div>
                </div>
                <div class="card-body">
                    <table class="dash-table" id="registrationsByMajor">
                        <thead>
                            <tr>
                                <th>Ngành học</th>
                                <th style="text-align:right">Số lượng</th>
                                <th style="text-align:right">Tỷ lệ</th>
                                <th style="width:200px">Biểu đồ</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- API sẽ fill dữ liệu vào đây -->
                            <tr>
                                <td>Công nghệ thông tin</td>
                                <td style="text-align:right">--</td>
                                <td style="text-align:right">--</td>
                                <td><div class="bar-chart"><div class="bar-fill" style="width:0%"></div></div></td>
                            </tr>
                            <tr>
                                <td>Quản trị kinh doanh</td>
                                <td style="text-align:right">--</td>
                                <td style="text-align:right">--</td>
                                <td><div class="bar-chart"><div class="bar-fill bar-fill--green" style="width:0%"></div></div></td>
                            </tr>
                            <tr>
                                <td>Ngôn ngữ Anh</td>
                                <td style="text-align:right">--</td>
                                <td style="text-align:right">--</td>
                                <td><div class="bar-chart"><div class="bar-fill bar-fill--yellow" style="width:0%"></div></div></td>
                            </tr>
                            <tr>
                                <td>Kỹ thuật phần mềm</td>
                                <td style="text-align:right">--</td>
                                <td style="text-align:right">--</td>
                                <td><div class="bar-chart"><div class="bar-fill bar-fill--purple" style="width:0%"></div></div></td>
                            </tr>
                            <tr>
                                <td>Ngành khác</td>
                                <td style="text-align:right">--</td>
                                <td style="text-align:right">--</td>
                                <td><div class="bar-chart"><div class="bar-fill bar-fill--grey" style="width:0%"></div></div></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <div class="col-lg-4">
            <div class="card">
                <div class="card-header">
                    <h3>Trạng thái hồ sơ</h3>
                </div>
                <div class="card-body">
                    <div class="status-list" id="registrationStatus">
                        <div class="status-item">
                            <span class="status-dot status-dot--new"></span>
                            <span class="status-label">Mới tạo</span>
                            <span class="status-count">--</span>
                        </div>
                        <div class="status-item">
                            <span class="status-dot status-dot--contacted"></span>
                            <span class="status-label">Đã liên hệ</span>
                            <span class="status-count">--</span>
                        </div>
                        <div class="status-item">
                            <span class="status-dot status-dot--interview"></span>
                            <span class="status-label">Đang xét tuyển</span>
                            <span class="status-count">--</span>
                        </div>
                        <div class="status-item">
                            <span class="status-dot status-dot--admitted"></span>
                            <span class="status-label">Trúng tuyển</span>
                            <span class="status-count">--</span>
                        </div>
                        <div class="status-item">
                            <span class="status-dot status-dot--rejected"></span>
                            <span class="status-label">Không trúng tuyển</span>
                            <span class="status-count">--</span>
                        </div>
                        <div class="status-item">
                            <span class="status-dot status-dot--cancelled"></span>
                            <span class="status-label">Đã hủy / rút</span>
                            <span class="status-count">--</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- ======== ROW 3: PERIODS & SOURCES ======== -->
    <div class="row">
        <div class="col-lg-6">
            <div class="card">
                <div class="card-header">
                    <h3>Hồ sơ theo đợt xét tuyển</h3>
                </div>
                <div class="card-body">
                    <table class="dash-table" id="registrationsByPeriod">
                        <thead>
                            <tr>
                                <th>Đợt xét tuyển</th>
                                <th style="text-align:right">Hồ sơ</th>
                                <th style="text-align:right">Trúng tuyển</th>
                                <th style="text-align:right">Tỷ lệ</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td>Đợt 1 - 2026</td><td style="text-align:right">--</td><td style="text-align:right">--</td><td style="text-align:right">--</td></tr>
                            <tr><td>Đợt 2 - 2026</td><td style="text-align:right">--</td><td style="text-align:right">--</td><td style="text-align:right">--</td></tr>
                            <tr><td>Đợt 3 - 2026</td><td style="text-align:right">--</td><td style="text-align:right">--</td><td style="text-align:right">--</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <div class="col-lg-6">
            <div class="card">
                <div class="card-header">
                    <h3>Nguồn đăng ký</h3>
                </div>
                <div class="card-body">
                    <table class="dash-table" id="registrationsBySource">
                        <thead>
                            <tr>
                                <th>Nguồn</th>
                                <th style="text-align:right">Hồ sơ</th>
                                <th style="text-align:right">Tỷ lệ</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td>Website</td><td style="text-align:right">--</td><td style="text-align:right">--</td></tr>
                            <tr><td>Đối tác</td><td style="text-align:right">--</td><td style="text-align:right">--</td></tr>
                            <tr><td>Facebook / Quảng cáo</td><td style="text-align:right">--</td><td style="text-align:right">--</td></tr>
                            <tr><td>Giới thiệu</td><td style="text-align:right">--</td><td style="text-align:right">--</td></tr>
                            <tr><td>Khác</td><td style="text-align:right">--</td><td style="text-align:right">--</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- ======== ROW 4: COUNCIL & REVENUE ======== -->
    <div class="row">
        <div class="col-lg-6">
            <div class="card">
                <div class="card-header">
                    <h3>Kết quả hội đồng xét tuyển</h3>
                    <div class="card-actions">
                        <span class="badge badge--warning">Chờ xử lý: --</span>
                    </div>
                </div>
                <div class="card-body">
                    <table class="dash-table" id="councilResults">
                        <thead>
                            <tr>
                                <th>Hội đồng</th>
                                <th style="text-align:right">Trúng tuyển</th>
                                <th style="text-align:right">Không trúng</th>
                                <th style="text-align:right">Tổng</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td>HĐ Xét tuyển Đợt 1</td><td style="text-align:right">--</td><td style="text-align:right">--</td><td style="text-align:right">--</td></tr>
                            <tr><td>HĐ Xét tuyển Đợt 2</td><td style="text-align:right">--</td><td style="text-align:right">--</td><td style="text-align:right">--</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <div class="col-lg-6">
            <div class="card">
                <div class="card-header">
                    <h3>Doanh thu gần đây</h3>
                    <div class="card-actions">
                        <a href="#" class="card-link">Xem tất cả</a>
                    </div>
                </div>
                <div class="card-body">
                    <table class="dash-table" id="recentRevenue">
                        <thead>
                            <tr>
                                <th>Mã GD</th>
                                <th>Đối tác</th>
                                <th style="text-align:right">Số tiền</th>
                                <th>Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td>---</td><td>---</td><td style="text-align:right">--</td><td><span class="badge badge--success">--</span></td></tr>
                            <tr><td>---</td><td>---</td><td style="text-align:right">--</td><td><span class="badge badge--warning">--</span></td></tr>
                            <tr><td>---</td><td>---</td><td style="text-align:right">--</td><td><span class="badge badge--danger">--</span></td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- ======== ROW 5: TỔNG QUAN HỆ THỐNG ======== -->
    <div class="row">
        <div class="col-12">
            <div class="card">
                <div class="card-header">
                    <h3>Tổng quan hệ thống</h3>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-3 col-6">
                            <div class="stat-box">
                                <div class="stat-box-icon stat-box-icon--blue">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                                </div>
                                <span class="stat-box-label">Ngành đào tạo</span>
                                <span class="stat-box-value">--</span>
                                <span class="stat-box-sub">đang hoạt động</span>
                            </div>
                        </div>
                        <div class="col-md-3 col-6">
                            <div class="stat-box">
                                <div class="stat-box-icon stat-box-icon--green">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                                </div>
                                <span class="stat-box-label">CT Đào tạo</span>
                                <span class="stat-box-value">--</span>
                                <span class="stat-box-sub">chương trình</span>
                            </div>
                        </div>
                        <div class="col-md-3 col-6">
                            <div class="stat-box">
                                <div class="stat-box-icon stat-box-icon--yellow">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                </div>
                                <span class="stat-box-label">Nhân viên</span>
                                <span class="stat-box-value">--</span>
                                <span class="stat-box-sub">đang hoạt động</span>
                            </div>
                        </div>
                        <div class="col-md-3 col-6">
                            <div class="stat-box">
                                <div class="stat-box-icon stat-box-icon--red">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                </div>
                                <span class="stat-box-label">Tư vấn viên</span>
                                <span class="stat-box-value">--</span>
                                <span class="stat-box-sub">đang hoạt động</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- ======== ROW 6: HOẠT ĐỘNG TƯ VẤN GẦN ĐÂY ======== -->
    <div class="row">
        <div class="col-12">
            <div class="card">
                <div class="card-header">
                    <h3>Hoạt động tư vấn gần đây</h3>
                    <div class="card-actions">
                        <a href="#" class="card-link">Xem tất cả</a>
                    </div>
                </div>
                <div class="card-body">
                    <table class="dash-table" id="recentConsultations">
                        <thead>
                            <tr>
                                <th>Thời gian</th>
                                <th>Hồ sơ</th>
                                <th>Người tư vấn</th>
                                <th>Hình thức</th>
                                <th>Kết quả</th>
                                <th>Follow-up</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td>--</td><td>--</td><td>--</td><td>--</td><td>--</td><td>--</td></tr>
                            <tr><td>--</td><td>--</td><td>--</td><td>--</td><td>--</td><td>--</td></tr>
                            <tr><td>--</td><td>--</td><td>--</td><td>--</td><td>--</td><td>--</td></tr>
                            <tr><td>--</td><td>--</td><td>--</td><td>--</td><td>--</td><td>--</td></tr>
                            <tr><td>--</td><td>--</td><td>--</td><td>--</td><td>--</td><td>--</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

</div>

<!-- ============================================================ -->
<!-- STYLES - SỬ DỤNG CSS VARIABLES CỦA THEME HIỆN TẠI           -->
<!-- ============================================================ -->
<style>
    /* ── Container ── */
    .dash-container {
        padding: 4px 0;
    }

    /* ── Header ── */
    .dash-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 24px;
        flex-wrap: wrap;
        gap: 12px;
    }
    .dash-title {
        font-size: 24px;
        font-weight: 600;
        margin: 0 0 4px 0;
        color: #1e293b;
    }
    .dash-subtitle {
        margin: 0;
        font-size: 13px;
        color: #8996a4;
    }
    .dash-header-actions {
        display: flex;
        gap: 10px;
        align-items: center;
    }
    .dash-select {
        padding: 8px 32px 8px 14px;
        border: 1px solid #dbe0e5;
        border-radius: 8px;
        font-size: 13px;
        background: #fff;
        color: #1e293b;
        cursor: pointer;
        appearance: auto;
        font-family: inherit;
    }
    .dash-select:focus {
        outline: none;
        border-color: #4680ff;
        box-shadow: 0 0 0 3px rgba(70,128,255,0.15);
    }
    .dash-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 18px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        border: 1px solid #dbe0e5;
        background: #fff;
        color: #475569;
        transition: all 0.2s;
        font-family: inherit;
    }
    .dash-btn:hover {
        background: #f8f9fa;
    }
    .dash-btn-primary {
        background: #4680ff;
        color: #fff;
        border-color: #4680ff;
    }
    .dash-btn-primary:hover {
        background: #3a6fe0;
        border-color: #3a6fe0;
    }

    /* ── KPI Cards ── */
    .kpi-card {
        background: #fff;
        border-radius: 12px;
        padding: 20px 24px;
        display: flex;
        align-items: center;
        gap: 16px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
        transition: box-shadow 0.2s, transform 0.2s;
        margin-bottom: 20px;
    }
    .kpi-card:hover {
        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        transform: translateY(-1px);
    }
    .kpi-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
    .kpi-icon--blue  { background: #e9f0ff; color: #4680ff; }
    .kpi-icon--green { background: #e6f5f0; color: #2ca87f; }
    .kpi-icon--yellow{ background: #fcf1e0; color: #e58a00; }
    .kpi-icon--red   { background: #fbe5e5; color: #dc2626; }
    .kpi-icon svg    { display: block; }
    .kpi-body {
        flex: 1;
        min-width: 0;
    }
    .kpi-label {
        display: block;
        font-size: 13px;
        color: #8996a4;
        margin-bottom: 4px;
    }
    .kpi-value {
        display: block;
        font-size: 26px;
        font-weight: 700;
        color: #1e293b;
        line-height: 1.2;
    }
    .kpi-change {
        font-size: 12px;
        font-weight: 500;
        margin-top: 4px;
        display: inline-block;
    }
    .kpi-change--up   { color: #2ca87f; }
    .kpi-change--down { color: #dc2626; }

    /* ── Cards ── */
    .card {
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
        margin-bottom: 20px;
        overflow: hidden;
    }
    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 18px 24px 0;
        flex-wrap: wrap;
        gap: 8px;
    }
    .card-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #1e293b;
    }
    .card-actions {
        display: flex;
        gap: 8px;
        align-items: center;
    }
    .card-link {
        font-size: 13px;
        color: #4680ff;
        text-decoration: none;
    }
    .card-link:hover {
        text-decoration: underline;
    }
    .card-body {
        padding: 16px 24px 24px;
    }

    /* ── Table ── */
    .dash-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
    }
    .dash-table thead th {
        text-align: left;
        padding: 10px 12px;
        font-weight: 600;
        color: #5b6b79;
        border-bottom: 2px solid #f3f5f7;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.3px;
    }
    .dash-table tbody td {
        padding: 12px 12px;
        border-bottom: 1px solid #f3f5f7;
        color: #1e293b;
    }
    .dash-table tbody tr:last-child td {
        border-bottom: none;
    }
    .dash-table tbody tr:hover {
        background: #f8f9fa;
    }

    /* ── Bar chart in table ── */
    .bar-chart {
        width: 100%;
        height: 8px;
        background: #f3f5f7;
        border-radius: 4px;
        overflow: hidden;
    }
    .bar-fill {
        height: 100%;
        background: #4680ff;
        border-radius: 4px;
        transition: width 0.6s ease;
    }
    .bar-fill--green { background: #2ca87f; }
    .bar-fill--yellow{ background: #e58a00; }
    .bar-fill--purple{ background: #8b5cf6; }
    .bar-fill--red   { background: #dc2626; }
    .bar-fill--grey  { background: #8996a4; }

    /* ── Status list ── */
    .status-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    .status-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 0;
        border-bottom: 1px solid #f3f5f7;
    }
    .status-item:last-child {
        border-bottom: none;
    }
    .status-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
    }
    .status-dot--new       { background: #4680ff; }
    .status-dot--contacted { background: #e58a00; }
    .status-dot--interview { background: #8b5cf6; }
    .status-dot--admitted  { background: #2ca87f; }
    .status-dot--rejected  { background: #dc2626; }
    .status-dot--cancelled { background: #8996a4; }
    .status-label {
        flex: 1;
        font-size: 13px;
        color: #475569;
    }
    .status-count {
        font-size: 16px;
        font-weight: 700;
        color: #1e293b;
    }

    /* ── Badges ── */
    .badge {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
        white-space: nowrap;
    }
    .badge--primary { background: #e9f0ff; color: #4680ff; }
    .badge--success { background: #e6f5f0; color: #2ca87f; }
    .badge--warning { background: #fcf1e0; color: #e58a00; }
    .badge--danger  { background: #fbe5e5; color: #dc2626; }
    .badge--info    { background: #e4f1ff; color: #2281df; }

    /* ── Stat boxes (hàng cuối) ── */
    .stat-box {
        text-align: center;
        padding: 20px 12px;
    }
    .stat-box-icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 10px;
    }
    .stat-box-icon--blue   { background: #e9f0ff; color: #4680ff; }
    .stat-box-icon--green  { background: #e6f5f0; color: #2ca87f; }
    .stat-box-icon--yellow { background: #fcf1e0; color: #e58a00; }
    .stat-box-icon--red    { background: #fbe5e5; color: #dc2626; }
    .stat-box-label {
        display: block;
        font-size: 12px;
        color: #8996a4;
        margin-bottom: 4px;
    }
    .stat-box-value {
        display: block;
        font-size: 24px;
        font-weight: 700;
        color: #1e293b;
        line-height: 1.2;
    }
    .stat-box-sub {
        display: block;
        font-size: 12px;
        color: #8996a4;
        margin-top: 2px;
    }

    /* ── Responsive ── */
    @media (max-width: 768px) {
        .dash-header {
            flex-direction: column;
        }
        .dash-title {
            font-size: 20px;
        }
        .kpi-card {
            padding: 16px;
        }
        .kpi-value {
            font-size: 22px;
        }
        .card-header {
            padding: 14px 16px 0;
        }
        .card-body {
            padding: 12px 16px 16px;
        }
    }
</style>

<!-- ============================================================ -->
<!-- JAVASCRIPT MẪU - SAU NÀY THAY BẰNG API CALLS                -->
<!-- ============================================================ -->
<script>
    /**
     * MẪU: Sau này thay dữ liệu tĩnh bằng API calls.
     * Ví dụ:
     *   fetch('/api/dashboard/summary')
     *     .then(res => res.json())
     *     .then(data => renderDashboard(data));
     */
    (function() {
        // Cập nhật ngày hiện tại
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yyyy = now.getFullYear();
        document.getElementById('lastUpdate').textContent = dd + '/' + mm + '/' + yyyy;
    })();

    /**
     * Hàm mẫu để render dữ liệu từ API — triển khai sau.
     * function renderDashboard(data) {
     *     document.getElementById('totalRegistrations').textContent = data.totalRegistrations;
     *     // ... cập nhật từng trường
     * }
     */
</script>
```

## Các API endpoints cần xây dựng sau

| Endpoint | Mô tả |
|----------|-------|
| `GET /api/dashboard/summary` | Tổng quan: tổng hồ sơ, doanh thu, trúng tuyển, chờ xử lý |
| `GET /api/dashboard/by-major` | Hồ sơ theo ngành học (kèm tỷ lệ) |
| `GET /api/dashboard/by-status` | Hồ sơ theo trạng thái |
| `GET /api/dashboard/by-period` | Hồ sơ theo đợt xét tuyển |
| `GET /api/dashboard/by-source` | Hồ sơ theo nguồn đăng ký |
| `GET /api/dashboard/council-results` | Kết quả hội đồng xét tuyển |
| `GET /api/dashboard/recent-revenue` | Doanh thu gần đây |
| `GET /api/dashboard/recent-consultations` | Hoạt động tư vấn gần đây |
| `GET /api/dashboard/system-overview` | Tổng quan hệ thống (ngành, CTĐT, nhân sự) |
