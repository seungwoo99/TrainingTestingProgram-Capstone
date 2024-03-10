CREATE DATABASE  IF NOT EXISTS `test_train_db` /*!40100 DEFAULT CHARACTER SET utf8mb3 */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `test_train_db`;
-- MySQL dump 10.13  Distrib 8.0.34, for Win64 (x86_64)
--
-- Host: localhost    Database: test_train_db
-- ------------------------------------------------------
-- Server version	8.2.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `blooms_tax`
--

DROP TABLE IF EXISTS `blooms_tax`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `blooms_tax` (
  `blooms_id` int NOT NULL,
  `name` varchar(20) NOT NULL,
  `description` varchar(45) NOT NULL,
  `verbs` varchar(255) NOT NULL,
  PRIMARY KEY (`blooms_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `blooms_tax`
--

LOCK TABLES `blooms_tax` WRITE;
/*!40000 ALTER TABLE `blooms_tax` DISABLE KEYS */;
INSERT INTO `blooms_tax` VALUES (1,'Remember','Recall facts and basic concepts','Define, duplicate, list, memorize, repeat, state.'),(2,'Understand','Explain ideas or concepts','Classify, describe, discuss, explain, identify, locate, recognize, report, select, translate.'),(3,'Apply','Use information in new situations','Execute, implement, solve, use, demonstrate, interpret, operate, schedule, sketch.'),(4,'Analyze','Draw connections among ideas','Differentiate, organize, relate, compare, contrast, distinguish, examine, experiment, question, test.'),(5,'Evaluate','Justify a stance or decision','Appraise, argue, defend, judge, select, support, value, critique, weigh.'),(6,'Create','Produce new or original work','Design, assemble, construct, conjecture, develop, formulate, author, investigate.');
/*!40000 ALTER TABLE `blooms_tax` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `learning_objectives`
--

DROP TABLE IF EXISTS `learning_objectives`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `learning_objectives` (
  `obj_id` int NOT NULL AUTO_INCREMENT,
  `topic_id` int NOT NULL,
  `description` text NOT NULL,
  `blooms_id` int NOT NULL,
  `is_applicant` tinyint(1) NOT NULL,
  `is_apprentice` tinyint(1) NOT NULL,
  `is_journeyman` tinyint(1) NOT NULL,
  `is_senior` tinyint(1) NOT NULL,
  `is_chief` tinyint(1) NOT NULL,
  `is_coordinator` tinyint(1) NOT NULL,
  `tags` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`obj_id`,`topic_id`),
  KEY `learningobjs_fk_topics_idx` (`topic_id`),
  KEY `learningobjs_fk_blooms_idx` (`blooms_id`),
  CONSTRAINT `learningobjs_fk_blooms` FOREIGN KEY (`blooms_id`) REFERENCES `blooms_tax` (`blooms_id`),
  CONSTRAINT `learningobjs_fk_topics` FOREIGN KEY (`topic_id`) REFERENCES `topics` (`topic_id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `learning_objectives`
--

LOCK TABLES `learning_objectives` WRITE;
/*!40000 ALTER TABLE `learning_objectives` DISABLE KEYS */;
/*!40000 ALTER TABLE `learning_objectives` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `objective_references`
--

DROP TABLE IF EXISTS `objective_references`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `objective_references` (
  `objective_reference_id` int NOT NULL AUTO_INCREMENT,
  `obj_id` int NOT NULL,
  `topic_reference_id` int NOT NULL,
  `page/section` varchar(45) NOT NULL,
  PRIMARY KEY (`objective_reference_id`,`obj_id`),
  KEY `objrefs_fk_topicrefs_idx` (`topic_reference_id`),
  KEY `objrefs_fk_learningobjs_idx` (`obj_id`),
  CONSTRAINT `objrefs_fk_learningobjs` FOREIGN KEY (`obj_id`) REFERENCES `learning_objectives` (`obj_id`),
  CONSTRAINT `objrefs_fk_topicrefs` FOREIGN KEY (`topic_reference_id`) REFERENCES `topic_references` (`topic_reference_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `objective_references`
--

LOCK TABLES `objective_references` WRITE;
/*!40000 ALTER TABLE `objective_references` DISABLE KEYS */;
/*!40000 ALTER TABLE `objective_references` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `questions`
--

DROP TABLE IF EXISTS `questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `questions` (
  `question_id` int NOT NULL AUTO_INCREMENT,
  `obj_id` int NOT NULL,
  `question_desc` text NOT NULL,
  `question_text` longtext NOT NULL,
  `question_answer` longtext,
  `question_type` varchar(45) NOT NULL,
  `question_difficulty` int NOT NULL,
  `answer_explanation` varchar(255) DEFAULT NULL,
  `points_definition` varchar(255) DEFAULT NULL,
  `max_points` int NOT NULL,
  `source` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`question_id`,`obj_id`),
  KEY `questions_fk_learningobjs_idx` (`obj_id`),
  CONSTRAINT `questions_fk_learningobjs` FOREIGN KEY (`obj_id`) REFERENCES `learning_objectives` (`obj_id`)
) ENGINE=InnoDB AUTO_INCREMENT=145 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `questions`
--

LOCK TABLES `questions` WRITE;
/*!40000 ALTER TABLE `questions` DISABLE KEYS */;
/*!40000 ALTER TABLE `questions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subject_references`
--

DROP TABLE IF EXISTS `subject_references`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subject_references` (
  `reference_id` int NOT NULL AUTO_INCREMENT,
  `subject_id` int NOT NULL,
  `reference_name` varchar(100) NOT NULL,
  PRIMARY KEY (`reference_id`,`subject_id`),
  KEY `subrefs_fk_subjects` (`subject_id`),
  CONSTRAINT `subrefs_fk_subjects` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`subject_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subject_references`
--

LOCK TABLES `subject_references` WRITE;
/*!40000 ALTER TABLE `subject_references` DISABLE KEYS */;
/*!40000 ALTER TABLE `subject_references` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subjects`
--

DROP TABLE IF EXISTS `subjects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subjects` (
  `subject_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text NOT NULL,
  PRIMARY KEY (`subject_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subjects`
--

LOCK TABLES `subjects` WRITE;
/*!40000 ALTER TABLE `subjects` DISABLE KEYS */;
/*!40000 ALTER TABLE `subjects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `test_questions`
--

DROP TABLE IF EXISTS `test_questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `test_questions` (
  `test_id` int NOT NULL,
  `question_id` int NOT NULL,
  `question_order` int NOT NULL,
  PRIMARY KEY (`test_id`,`question_id`),
  KEY `question_id_idx` (`question_id`),
  CONSTRAINT `question_id` FOREIGN KEY (`question_id`) REFERENCES `questions` (`question_id`),
  CONSTRAINT `testquestions_fk_tests` FOREIGN KEY (`test_id`) REFERENCES `tests` (`test_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `test_questions`
--

LOCK TABLES `test_questions` WRITE;
/*!40000 ALTER TABLE `test_questions` DISABLE KEYS */;
/*!40000 ALTER TABLE `test_questions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `test_scores`
--

DROP TABLE IF EXISTS `test_scores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `test_scores` (
  `score_id` int NOT NULL AUTO_INCREMENT,
  `test_id` int NOT NULL,
  `tester_id` int NOT NULL,
  `attempt_date` timestamp NOT NULL,
  `total_score` int NOT NULL,
  `pass_status` tinyint(1) NOT NULL,
  PRIMARY KEY (`score_id`,`tester_id`,`test_id`),
  KEY `test_id_idx` (`test_id`),
  KEY `tester_id` (`tester_id`),
  CONSTRAINT `tester_id` FOREIGN KEY (`tester_id`) REFERENCES `testee` (`tester_id`),
  CONSTRAINT `testscores_fk_tests` FOREIGN KEY (`test_id`) REFERENCES `tests` (`test_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `test_scores`
--

LOCK TABLES `test_scores` WRITE;
/*!40000 ALTER TABLE `test_scores` DISABLE KEYS */;
/*!40000 ALTER TABLE `test_scores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `testee`
--

DROP TABLE IF EXISTS `testee`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `testee` (
  `tester_id` int NOT NULL AUTO_INCREMENT,
  `testee_name` varchar(45) NOT NULL,
  PRIMARY KEY (`tester_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `testee`
--

LOCK TABLES `testee` WRITE;
/*!40000 ALTER TABLE `testee` DISABLE KEYS */;
/*!40000 ALTER TABLE `testee` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tests`
--

DROP TABLE IF EXISTS `tests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tests` (
  `test_id` int NOT NULL AUTO_INCREMENT,
  `test_name` varchar(100) NOT NULL,
  `test_description` text NOT NULL,
  `created_by` varchar(100) NOT NULL,
  `creation_date` timestamp NOT NULL,
  `modified_by` varchar(100) NOT NULL,
  `last_modified_date` timestamp NOT NULL,
  `active_status` tinyint(1) NOT NULL,
  `total_score` int NOT NULL,
  PRIMARY KEY (`test_id`),
  UNIQUE KEY `test_name_UNIQUE` (`test_name`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tests`
--

LOCK TABLES `tests` WRITE;
/*!40000 ALTER TABLE `tests` DISABLE KEYS */;
/*!40000 ALTER TABLE `tests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `topic_references`
--

DROP TABLE IF EXISTS `topic_references`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `topic_references` (
  `topic_reference_id` int NOT NULL AUTO_INCREMENT,
  `topic_id` int NOT NULL,
  `reference_id` int NOT NULL,
  PRIMARY KEY (`topic_reference_id`,`topic_id`),
  KEY `toprefs_fk_subrefs_idx` (`reference_id`),
  KEY `toprefs_fk_topics_idx` (`topic_id`),
  CONSTRAINT `toprefs_fk_subrefs` FOREIGN KEY (`reference_id`) REFERENCES `subject_references` (`reference_id`),
  CONSTRAINT `toprefs_fk_topics` FOREIGN KEY (`topic_id`) REFERENCES `topics` (`topic_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `topic_references`
--

LOCK TABLES `topic_references` WRITE;
/*!40000 ALTER TABLE `topic_references` DISABLE KEYS */;
/*!40000 ALTER TABLE `topic_references` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `topics`
--

DROP TABLE IF EXISTS `topics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `topics` (
  `topic_id` int NOT NULL AUTO_INCREMENT,
  `subject_id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `facility` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`topic_id`,`subject_id`),
  KEY `topics_fk_subjects_idx` (`subject_id`),
  CONSTRAINT `topics_fk_subjects` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`subject_id`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `topics`
--

LOCK TABLES `topics` WRITE;
/*!40000 ALTER TABLE `topics` DISABLE KEYS */;
/*!40000 ALTER TABLE `topics` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `username` varchar(16) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(60) NOT NULL,
  `name` varchar(45) NOT NULL,
  `is_admin` tinyint(1) NOT NULL,
  `is_verified` tinyint(1) NOT NULL,
  PRIMARY KEY (`username`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2024-03-07 11:27:41
