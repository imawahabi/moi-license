-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 29, 2025 at 08:46 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `kuwait_police_licenses`
--

-- --------------------------------------------------------

--
-- Table structure for table `employees`
--

CREATE TABLE `employees` (
  `id` int(11) NOT NULL,
  `full_name` varchar(255) NOT NULL COMMENT 'الاسم الكامل',
  `rank` varchar(100) NOT NULL COMMENT 'الرتبة',
  `file_number` varchar(50) NOT NULL COMMENT 'رقم الملف',
  `category` enum('ضابط','ضابط صف','مهني','مدني') NOT NULL COMMENT 'الفئة',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `employees`
--

INSERT INTO `employees` (`id`, `full_name`, `rank`, `file_number`, `category`, `created_at`, `updated_at`) VALUES
(9, 'مشاري سامي الوهيب', 'رائد حقوقي', '612154', 'ضابط', '2025-07-16 06:19:50', '2025-07-29 06:44:44'),
(10, 'خالد طارق بن شعبان', 'ملازم أول', '743542', 'ضابط', '2025-07-16 06:20:18', '2025-07-16 06:20:18'),
(11, 'محمد إبراهيم الحميدي', 'ملازم أول حقوقي', '887981', 'ضابط', '2025-07-16 06:20:32', '2025-07-16 06:20:32'),
(12, 'أحمد محمد ملا علي', 'ملازم أول', '458325', 'ضابط', '2025-07-16 06:20:47', '2025-07-16 06:20:47'),
(13, 'عمر صبحي الهندي', 'و.أ.ضابط', '457515', 'ضابط', '2025-07-16 06:21:00', '2025-07-16 06:21:00'),
(14, 'عقاب ميسر العياف', 'و.أ.ضابط', '744212', 'ضابط صف', '2025-07-16 06:21:11', '2025-07-16 06:21:17'),
(15, 'محمد مناحي القحطاني', 'و.أ.ضابط', '237388', 'ضابط صف', '2025-07-16 06:21:30', '2025-07-16 06:21:30'),
(16, 'حمود ناجي الجمعه', 'و.أ.ضابط', '805521', 'ضابط صف', '2025-07-16 06:21:45', '2025-07-16 06:21:45'),
(17, 'مساعد غصاب الفضلي', 'و.أ.ضابط', '290947', 'ضابط صف', '2025-07-16 06:22:02', '2025-07-16 06:22:02'),
(18, 'أنور علي النجار', 'و.أ.ضابط', '289531', 'ضابط صف', '2025-07-16 06:22:17', '2025-07-16 06:22:17'),
(19, 'مصعب عبدالله علي الكندري', 'و.ضابط', '895973', 'ضابط صف', '2025-07-16 06:22:33', '2025-07-16 06:22:33'),
(20, 'عيسى مبارك نومان الفضلي', 'و.ضابط', '897029', 'ضابط صف', '2025-07-16 06:22:44', '2025-07-16 06:22:44'),
(21, 'فهد عبدالهادي محمد الهاجري', 'و.ضابط', '897075', 'ضابط صف', '2025-07-16 06:22:58', '2025-07-16 06:22:58'),
(22, 'حمد عبدالله شامان الديحاني', 'و.ضابط', '897110', 'ضابط صف', '2025-07-16 06:23:10', '2025-07-16 06:23:10'),
(23, 'حمد خالد الخميس', 'رقيب أول', '886457', 'ضابط صف', '2025-07-16 06:23:24', '2025-07-16 06:23:24'),
(24, 'أحمد عبدالله أحمد الكندري', 'رقيب أول', '899088', 'ضابط صف', '2025-07-16 06:23:35', '2025-07-16 06:23:35'),
(25, 'يوسف خالد محمد الكندري', 'رقيب أول', '899100', 'ضابط صف', '2025-07-16 06:23:47', '2025-07-16 06:23:47'),
(26, 'يوسف خالد راشد الرشيد', 'رقيب أول', '899144', 'ضابط صف', '2025-07-16 06:23:58', '2025-07-16 06:23:58'),
(27, 'عبدالرحمن مبارك الحمدان', 'رقيب أول', '899394', 'ضابط صف', '2025-07-16 06:24:15', '2025-07-16 06:24:15'),
(28, 'علي خالد العبدالسلام', 'رقيب أول', '869243', 'ضابط صف', '2025-07-16 06:24:27', '2025-07-16 06:24:27'),
(29, 'احمد عادل محمد الشلال', 'رقيب', '691895', 'ضابط صف', '2025-07-16 06:24:38', '2025-07-16 06:24:38'),
(30, 'فهد ضيف الله الشمري', 'عريف', '876459', 'ضابط صف', '2025-07-16 06:24:48', '2025-07-16 06:24:48'),
(31, 'محمد جمال المطيري', 'عريف', '876761', 'ضابط صف', '2025-07-16 06:24:58', '2025-07-16 06:24:58'),
(32, 'فواز صالح الشرف', 'عريف', '877469', 'ضابط صف', '2025-07-16 06:25:09', '2025-07-16 06:25:09'),
(33, 'ظافر ضيف الله الشمري', 'عريف', '877915', 'ضابط صف', '2025-07-16 06:25:20', '2025-07-16 06:25:20'),
(34, 'عبدالمطلب محمد فوزي حجاج', 'باحث قانوني', '882885', 'مهني', '2025-07-16 06:25:40', '2025-07-16 06:26:08'),
(35, 'أحمد يسري ابو العلا', 'طباع', '637998', 'مهني', '2025-07-16 06:25:51', '2025-07-16 06:25:51'),
(36, 'محمد احمد عبدالوهاب احمد', 'مدخل بيانات', '869549', 'مهني', '2025-07-16 06:26:22', '2025-07-16 06:26:22'),
(37, 'مصطفى سيد مسامح عبدالجليل', 'مدقق لغوي', '869829', 'مهني', '2025-07-16 06:26:35', '2025-07-16 06:26:35'),
(38, 'احمد محمد عبده البابلي', 'طباع', '873851', 'مهني', '2025-07-16 06:26:43', '2025-07-16 06:26:43'),
(39, 'سامي عبدالرحيم أحمد الخطيب', 'طباع', '889227', 'مهني', '2025-07-16 06:26:51', '2025-07-16 06:26:51'),
(40, 'مصطفى كامل علي سليم', 'طباع', '666076', 'مهني', '2025-07-16 06:26:59', '2025-07-16 06:26:59'),
(41, 'عبدالرحمن عبدالآخر عبدالرحمن', 'طباع', '677205', 'مهني', '2025-07-16 06:27:11', '2025-07-16 06:27:11'),
(42, 'محمد عصام احمد', 'طباع', '677213', 'مهني', '2025-07-16 06:27:36', '2025-07-16 06:27:36'),
(43, 'عمرو صلاح فتوحي', 'طباع', '793922', 'مهني', '2025-07-16 06:27:47', '2025-07-16 06:27:47'),
(44, 'محمد بدوي جودة', 'مسجل بيانات', '663999', 'مهني', '2025-07-16 06:27:56', '2025-07-16 06:27:56'),
(45, 'عصام محمد غازي', 'مسجل بيانات', '284610', 'مهني', '2025-07-16 06:28:08', '2025-07-16 06:28:08'),
(46, 'عبدالله عبدالقاسم زيد الفضيلة', 'مندوب', '640131', 'مهني', '2025-07-16 06:28:21', '2025-07-16 06:28:21'),
(47, 'رضا عبدالرازق عبداللطيف', 'سائق', '866633', 'مهني', '2025-07-16 06:28:37', '2025-07-16 06:28:37'),
(48, 'ناجا سوما سيكارا', 'سائق', '426555', 'مهني', '2025-07-16 06:28:50', '2025-07-16 06:28:50'),
(49, 'كاتي ياراما ريدي', 'سائق', '444871', 'مهني', '2025-07-16 06:28:58', '2025-07-16 06:28:58'),
(50, 'سالم حنيني فرج الله', 'سائق', '714534', 'مهني', '2025-07-16 06:29:07', '2025-07-16 06:29:07'),
(51, 'عبدالله عمر فاهمه', 'سائق', '891759', 'مهني', '2025-07-16 06:29:19', '2025-07-16 06:29:19'),
(52, 'محمد غوس الدين امين الدين', 'سائق', '866831', 'مهني', '2025-07-16 06:29:28', '2025-07-16 06:29:28'),
(53, 'مجدي أحمد أبو المجد رضوان', 'سائق', '869733', 'مهني', '2025-07-16 06:29:38', '2025-07-16 06:29:38'),
(54, 'ام دي عباس ام دي مانو', 'سائق', '868407', 'مهني', '2025-07-16 06:29:46', '2025-07-16 06:29:46'),
(55, 'هداية الله باشا صاحبشيخ', 'سائق', '891027', 'مهني', '2025-07-16 06:29:54', '2025-07-16 06:29:54'),
(56, 'فيصل الرحمن حبيب الرحمن', 'فراش', '382957', 'مهني', '2025-07-16 06:30:05', '2025-07-16 06:30:05'),
(57, 'محمد رافي شيخ', 'فراش', '569089', 'مهني', '2025-07-16 06:30:20', '2025-07-16 06:30:20'),
(58, 'محمد عبدالله عمران كاجارسول', 'فراش', '866355', 'مهني', '2025-07-16 06:30:31', '2025-07-16 06:30:31'),
(59, 'حبيب رحمن جهيراسان', 'فراش', '327735', 'مهني', '2025-07-16 06:30:42', '2025-07-16 06:30:42'),
(60, 'سافيولا وانيس فيرنانديس', 'فراش', '382922', 'مهني', '2025-07-16 06:30:50', '2025-07-16 06:30:50'),
(61, 'شهيد الاسلام سراج الحق', 'فراش', '623911', 'مهني', '2025-07-16 06:31:00', '2025-07-16 06:31:00'),
(62, 'رابح فتحي شرابين', 'فراش', '869513', 'مهني', '2025-07-16 06:31:30', '2025-07-16 06:31:30'),
(63, 'راميل اوباموس الفاريز', 'فراش', '460451', 'مهني', '2025-07-16 06:31:38', '2025-07-16 06:31:38'),
(64, 'محمد عبدالمنان محمد', 'فراش', '891047', 'مهني', '2025-07-16 06:31:46', '2025-07-16 06:31:46'),
(65, 'محمد علي محمد أكبر علي', 'فراش', '889197', 'مهني', '2025-07-16 06:31:54', '2025-07-16 06:31:54'),
(66, 'اعجاز كل تاج محمد', 'فني تصوير', '351911', 'مهني', '2025-07-16 06:32:04', '2025-07-16 06:32:04'),
(67, 'شيخ عارف شيخ محبوب', 'فني تصوير', '866835', 'مهني', '2025-07-16 06:32:12', '2025-07-16 06:32:12'),
(68, 'محمد داستا جير أقبال', 'مهندس كمبيوتر', '862886', 'مهني', '2025-07-16 06:32:29', '2025-07-16 06:32:29'),
(69, 'توصيف أحمد أنور حسين', 'فني كمبيوتر', '862932', 'مهني', '2025-07-16 06:32:40', '2025-07-16 06:32:40'),
(70, 'اسلام السيد محمد عبدالخالق', 'فني كمبيوتر', '869695', 'مهني', '2025-07-16 06:32:48', '2025-07-16 06:32:48'),
(71, 'موزه خميس عبيد النعيمي', 'سكرتيرة', '866333', 'مهني', '2025-07-16 06:32:56', '2025-07-16 06:32:56'),
(73, 'محمد محمد قاسم أحمد', 'رئيس قسم', '273112300976', 'مدني', '2025-07-24 07:14:30', '2025-07-24 07:17:46'),
(76, 'حميده سعيد التحو', 'رئيس قسم', '283072601334', 'مدني', '2025-07-24 07:18:18', '2025-07-24 07:18:18'),
(77, 'عبد الله محمد جاسم العنزي', 'م . أول حاسوب', '284012401263', 'مدني', '2025-07-24 07:18:50', '2025-07-24 07:18:50'),
(78, 'عبد العزيز سليمان الحوطي', 'مسجل بيانات', '293072101128', 'مدني', '2025-07-24 07:19:07', '2025-07-24 07:19:07'),
(79, 'نور سعد ناصر سعد', 'فني أول حاسوب', '277101701019', 'مدني', '2025-07-24 07:19:24', '2025-07-24 07:19:24'),
(80, 'عائشة صلاح محمد العميري', 'سكرتيرة', '298050600105', 'مدني', '2025-07-24 07:19:40', '2025-07-24 07:19:40'),
(81, 'عهود راشد عبد الله مظفر', 'م . م . إلكترونيات', '280121400464', 'مدني', '2025-07-24 07:20:27', '2025-07-24 07:20:27'),
(82, 'أماني فايز حسين مطر', 'سكرتير أول', '293030401181', 'مدني', '2025-07-24 07:34:01', '2025-07-24 07:34:01'),
(83, 'فاطمة غانم إبراهيم الحساوي', 'كاتب حسابات', '277040901278', 'مدني', '2025-07-24 07:34:16', '2025-07-24 07:34:16'),
(84, 'عمر مساعد يعقوب النجار', 'م.م.إداري معاملات', '297083100225', 'مدني', '2025-07-24 07:34:40', '2025-07-24 07:34:40'),
(85, 'راشد أنور إسماعيل', 'أمين مخزن', '299041800046', 'مدني', '2025-07-24 07:36:50', '2025-07-24 07:36:50'),
(86, 'حصه عيسى عبدالله الخليل', 'مترجم مبتدئ', '299072400862', 'مدني', '2025-07-24 07:37:07', '2025-07-24 07:37:07');

-- --------------------------------------------------------

--
-- Stand-in structure for view `employee_license_summary`
-- (See below for the actual view)
--
CREATE TABLE `employee_license_summary` (
`id` int(11)
,`full_name` varchar(255)
,`rank` varchar(100)
,`file_number` varchar(50)
,`category` enum('ضابط','ضابط صف','مهني','مدني')
,`total_licenses` bigint(21)
,`full_day_licenses` decimal(22,0)
,`hours_licenses` decimal(22,0)
,`total_hours` decimal(32,0)
);

-- --------------------------------------------------------

--
-- Table structure for table `licenses`
--

CREATE TABLE `licenses` (
  `id` int(11) NOT NULL,
  `employee_id` int(11) NOT NULL,
  `license_type` enum('يوم كامل','ساعات محددة') NOT NULL COMMENT 'نوع الرخصة',
  `license_date` date NOT NULL COMMENT 'تاريخ الرخصة',
  `hours` int(11) DEFAULT NULL COMMENT 'عدد الساعات (للرخص المحددة بالساعات)',
  `month` int(11) NOT NULL COMMENT 'الشهر (محسوب تلقائياً)',
  `year` int(11) NOT NULL COMMENT 'السنة (محسوب تلقائياً)',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

--
-- Dumping data for table `licenses`
--

INSERT INTO `licenses` (`id`, `employee_id`, `license_type`, `license_date`, `hours`, `month`, `year`, `created_at`, `updated_at`) VALUES
(33, 36, 'يوم كامل', '2025-07-29', NULL, 7, 2025, '2025-07-29 06:45:27', '2025-07-29 06:45:27');

-- --------------------------------------------------------

--
-- Stand-in structure for view `licenses_with_employee_details`
-- (See below for the actual view)
--
CREATE TABLE `licenses_with_employee_details` (
`id` int(11)
,`employee_id` int(11)
,`full_name` varchar(255)
,`rank` varchar(100)
,`file_number` varchar(50)
,`category` enum('ضابط','ضابط صف','مهني','مدني')
,`license_type` enum('يوم كامل','ساعات محددة')
,`license_date` date
,`hours` int(11)
,`month` int(11)
,`year` int(11)
,`created_at` timestamp
,`updated_at` timestamp
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `monthly_license_stats`
-- (See below for the actual view)
--
CREATE TABLE `monthly_license_stats` (
`year` int(11)
,`month` int(11)
,`total_licenses` bigint(21)
,`full_day_licenses` decimal(22,0)
,`hours_licenses` decimal(22,0)
,`total_hours` decimal(32,0)
);

-- --------------------------------------------------------

--
-- Structure for view `employee_license_summary`
--
DROP TABLE IF EXISTS `employee_license_summary`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `employee_license_summary`  AS SELECT `e`.`id` AS `id`, `e`.`full_name` AS `full_name`, `e`.`rank` AS `rank`, `e`.`file_number` AS `file_number`, `e`.`category` AS `category`, count(`l`.`id`) AS `total_licenses`, sum(case when `l`.`license_type` = 'يوم كامل' then 1 else 0 end) AS `full_day_licenses`, sum(case when `l`.`license_type` = 'ساعات محددة' then 1 else 0 end) AS `hours_licenses`, sum(coalesce(`l`.`hours`,0)) AS `total_hours` FROM (`employees` `e` left join `licenses` `l` on(`e`.`id` = `l`.`employee_id`)) GROUP BY `e`.`id`, `e`.`full_name`, `e`.`rank`, `e`.`file_number`, `e`.`category` ORDER BY `e`.`full_name` ASC ;

-- --------------------------------------------------------

--
-- Structure for view `licenses_with_employee_details`
--
DROP TABLE IF EXISTS `licenses_with_employee_details`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `licenses_with_employee_details`  AS SELECT `l`.`id` AS `id`, `l`.`employee_id` AS `employee_id`, `e`.`full_name` AS `full_name`, `e`.`rank` AS `rank`, `e`.`file_number` AS `file_number`, `e`.`category` AS `category`, `l`.`license_type` AS `license_type`, `l`.`license_date` AS `license_date`, `l`.`hours` AS `hours`, `l`.`month` AS `month`, `l`.`year` AS `year`, `l`.`created_at` AS `created_at`, `l`.`updated_at` AS `updated_at` FROM (`licenses` `l` join `employees` `e` on(`l`.`employee_id` = `e`.`id`)) ORDER BY `l`.`license_date` DESC ;

-- --------------------------------------------------------

--
-- Structure for view `monthly_license_stats`
--
DROP TABLE IF EXISTS `monthly_license_stats`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `monthly_license_stats`  AS SELECT `licenses`.`year` AS `year`, `licenses`.`month` AS `month`, count(0) AS `total_licenses`, sum(case when `licenses`.`license_type` = 'يوم كامل' then 1 else 0 end) AS `full_day_licenses`, sum(case when `licenses`.`license_type` = 'ساعات محددة' then 1 else 0 end) AS `hours_licenses`, sum(coalesce(`licenses`.`hours`,0)) AS `total_hours` FROM `licenses` GROUP BY `licenses`.`year`, `licenses`.`month` ORDER BY `licenses`.`year` DESC, `licenses`.`month` DESC ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `employees`
--
ALTER TABLE `employees`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `file_number` (`file_number`),
  ADD KEY `idx_full_name` (`full_name`),
  ADD KEY `idx_rank` (`rank`),
  ADD KEY `idx_file_number` (`file_number`),
  ADD KEY `idx_category` (`category`);

--
-- Indexes for table `licenses`
--
ALTER TABLE `licenses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_employee_id` (`employee_id`),
  ADD KEY `idx_license_date` (`license_date`),
  ADD KEY `idx_license_type` (`license_type`),
  ADD KEY `idx_month_year` (`month`,`year`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `employees`
--
ALTER TABLE `employees`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=87;

--
-- AUTO_INCREMENT for table `licenses`
--
ALTER TABLE `licenses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `licenses`
--
ALTER TABLE `licenses`
  ADD CONSTRAINT `licenses_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
